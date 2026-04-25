using CoreCourierService.Api.Services;
using CoreCourierService.Core;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;

namespace CoreCourierService.Tests;

/// <summary>
/// Unit tests for <see cref="TenantUserService"/> focusing on the secure invitation flow.
/// </summary>
public class TenantUserServiceTests
{
    private readonly Mock<ITenantUserRepository> _repoMock = new();
    private readonly Mock<ITenantContext> _tenantContextMock = new();
    private readonly Mock<ILogger<TenantUserService>> _loggerMock = new();
    private readonly TenantUserService _sut;

    private const string TenantId = "tenant-abc";

    public TenantUserServiceTests()
    {
        _tenantContextMock.Setup(c => c.TenantId).Returns(TenantId);
        _sut = new TenantUserService(_repoMock.Object, _tenantContextMock.Object, _loggerMock.Object);
    }

    // ─── InviteUserAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task InviteUserAsync_CreatesUserWithInvitedStatus()
    {
        TenantUser? captured = null;
        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<TenantUser>()))
            .Callback<TenantUser>(u => captured = u)
            .ReturnsAsync((TenantUser u) => u);

        await _sut.InviteUserAsync("bob@example.com", ServiceConstants.UserRoles.Csr, "admin-user-id");

        captured.Should().NotBeNull();
        captured!.Status.Should().Be(ServiceConstants.UserStatuses.Invited);
    }

    [Fact]
    public async Task InviteUserAsync_SetsNonNullInvitationToken()
    {
        TenantUser? captured = null;
        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<TenantUser>()))
            .Callback<TenantUser>(u => captured = u)
            .ReturnsAsync((TenantUser u) => u);

        await _sut.InviteUserAsync("bob@example.com", ServiceConstants.UserRoles.Csr, "admin-user-id");

        captured!.InvitationToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task InviteUserAsync_TokenIs64HexChars()
    {
        TenantUser? captured = null;
        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<TenantUser>()))
            .Callback<TenantUser>(u => captured = u)
            .ReturnsAsync((TenantUser u) => u);

        await _sut.InviteUserAsync("bob@example.com", ServiceConstants.UserRoles.Csr, "admin-user-id");

        // 32 random bytes → 64 hex characters
        captured!.InvitationToken!.Length.Should().Be(64);
        captured.InvitationToken.Should().MatchRegex("^[0-9a-f]+$");
    }

    [Fact]
    public async Task InviteUserAsync_SetsExpiry7DaysFromNow()
    {
        TenantUser? captured = null;
        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<TenantUser>()))
            .Callback<TenantUser>(u => captured = u)
            .ReturnsAsync((TenantUser u) => u);

        var before = DateTime.UtcNow;
        await _sut.InviteUserAsync("bob@example.com", ServiceConstants.UserRoles.Csr, "admin-user-id");
        var after = DateTime.UtcNow;

        captured!.InvitationExpiresAt.Should().NotBeNull();
        captured.InvitationExpiresAt!.Value.Should().BeOnOrAfter(before.AddDays(7));
        captured.InvitationExpiresAt.Value.Should().BeOnOrBefore(after.AddDays(7).AddSeconds(1));
    }

    [Fact]
    public async Task InviteUserAsync_EachCallProducesUniqueToken()
    {
        var tokens = new List<string>();
        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<TenantUser>()))
            .Callback<TenantUser>(u => tokens.Add(u.InvitationToken!))
            .ReturnsAsync((TenantUser u) => u);

        await _sut.InviteUserAsync("a@example.com", ServiceConstants.UserRoles.Csr, "admin");
        await _sut.InviteUserAsync("b@example.com", ServiceConstants.UserRoles.Csr, "admin");

        tokens.Should().HaveCount(2);
        tokens[0].Should().NotBe(tokens[1]);
    }

    // ─── AcceptInvitationAsync ────────────────────────────────────────────────

    [Fact]
    public async Task AcceptInvitationAsync_ValidToken_ReturnsActivatedUser()
    {
        const string email = "bob@example.com";
        const string token = "aabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344";

        var pendingUser = new TenantUser
        {
            Auth0UserId = "pending_xyz",
            TenantId = TenantId,
            Email = email,
            Role = ServiceConstants.UserRoles.Csr,
            Status = ServiceConstants.UserStatuses.Invited,
            InvitationToken = token,
            InvitationExpiresAt = DateTime.UtcNow.AddDays(5)
        };

        _repoMock
            .Setup(r => r.GetPendingInvitationAsync(email, token))
            .ReturnsAsync(pendingUser);
        _repoMock
            .Setup(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<TenantUser>()))
            .ReturnsAsync(true);

        var result = await _sut.AcceptInvitationAsync("auth0|newuser", email, token);

        result.Should().NotBeNull();
        result!.Status.Should().Be(ServiceConstants.UserStatuses.Active);
        result.Auth0UserId.Should().Be("auth0|newuser");
    }

    [Fact]
    public async Task AcceptInvitationAsync_ValidToken_ClearsTokenAfterAcceptance()
    {
        const string email = "bob@example.com";
        const string token = "aabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344";

        var pendingUser = new TenantUser
        {
            Auth0UserId = "pending_xyz",
            TenantId = TenantId,
            Email = email,
            Role = ServiceConstants.UserRoles.Csr,
            Status = ServiceConstants.UserStatuses.Invited,
            InvitationToken = token,
            InvitationExpiresAt = DateTime.UtcNow.AddDays(5)
        };

        _repoMock
            .Setup(r => r.GetPendingInvitationAsync(email, token))
            .ReturnsAsync(pendingUser);
        _repoMock
            .Setup(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<TenantUser>()))
            .ReturnsAsync(true);

        var result = await _sut.AcceptInvitationAsync("auth0|newuser", email, token);

        result!.InvitationToken.Should().BeNull();
        result.InvitationExpiresAt.Should().BeNull();
    }

    [Fact]
    public async Task AcceptInvitationAsync_WrongToken_ReturnsNull()
    {
        const string email = "bob@example.com";

        _repoMock
            .Setup(r => r.GetPendingInvitationAsync(email, It.IsAny<string>()))
            .ReturnsAsync((TenantUser?)null);

        var result = await _sut.AcceptInvitationAsync("auth0|newuser", email, "wrongtoken");

        result.Should().BeNull();
    }

    [Fact]
    public async Task AcceptInvitationAsync_NoMatchingInvitation_ReturnsNull()
    {
        _repoMock
            .Setup(r => r.GetPendingInvitationAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((TenantUser?)null);

        var result = await _sut.AcceptInvitationAsync("auth0|newuser", "ghost@example.com", "anytoken");

        result.Should().BeNull();
    }

    [Fact]
    public async Task AcceptInvitationAsync_ValidToken_PersistsUpdate()
    {
        const string email = "bob@example.com";
        const string token = "aabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344";

        var pendingUser = new TenantUser
        {
            Auth0UserId = "pending_xyz",
            TenantId = TenantId,
            Email = email,
            Role = ServiceConstants.UserRoles.Csr,
            Status = ServiceConstants.UserStatuses.Invited,
            InvitationToken = token,
            InvitationExpiresAt = DateTime.UtcNow.AddDays(5)
        };

        _repoMock
            .Setup(r => r.GetPendingInvitationAsync(email, token))
            .ReturnsAsync(pendingUser);
        _repoMock
            .Setup(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<TenantUser>()))
            .ReturnsAsync(true);

        await _sut.AcceptInvitationAsync("auth0|newuser", email, token);

        _repoMock.Verify(r => r.UpdateAsync(It.IsAny<string>(), It.Is<TenantUser>(
            u => u.Status == ServiceConstants.UserStatuses.Active
              && u.InvitationToken == null)),
            Times.Once);
    }

    // ─── TenantId guard ──────────────────────────────────────────────────────

    [Fact]
    public async Task InviteUserAsync_ThrowsWhenTenantIdNotSet()
    {
        var noTenantContextMock = new Mock<ITenantContext>();
        noTenantContextMock.Setup(c => c.TenantId).Returns((string?)null);
        var sut = new TenantUserService(_repoMock.Object, noTenantContextMock.Object, _loggerMock.Object);

        await sut.Invoking(s => s.InviteUserAsync("a@b.com", "csr", "admin"))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*TenantId*");
    }

    // ─── Duplicate prevention ─────────────────────────────────────────────────

    [Fact]
    public async Task InviteUserAsync_DuplicateEmailSameTenant_Throws()
    {
        const string email = "duplicate@example.com";
        var existingUser = new TenantUser
        {
            TenantId = TenantId,
            Email = email,
            Status = ServiceConstants.UserStatuses.Invited
        };

        _repoMock
            .Setup(r => r.GetPendingByEmailAsync(email))
            .ReturnsAsync(existingUser);

        await _sut.Invoking(s => s.InviteUserAsync(email, "csr", "admin"))
            .Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*already exists*");
    }

    [Fact]
    public async Task InviteUserAsync_DuplicateEmailDifferentTenant_Succeeds()
    {
        const string email = "bob@example.com";
        var existingUser = new TenantUser
        {
            TenantId = "other-tenant",
            Email = email,
            Status = ServiceConstants.UserStatuses.Invited
        };

        _repoMock
            .Setup(r => r.GetPendingByEmailAsync(email))
            .ReturnsAsync(existingUser);
        _repoMock
            .Setup(r => r.CreateAsync(It.IsAny<TenantUser>()))
            .ReturnsAsync((TenantUser u) => u);

        var result = await _sut.InviteUserAsync(email, "csr", "admin");

        result.Should().NotBeNull();
    }

    // ─── ResendInvitationAsync ────────────────────────────────────────────────

    [Fact]
    public async Task ResendInvitationAsync_ExistingPendingInvite_RefreshesToken()
    {
        const string email = "bob@example.com";
        const string oldToken = "oldtoken000000000000000000000000000000000000000000000000000000";

        var pendingUser = new TenantUser
        {
            TenantId = TenantId,
            Email = email,
            Status = ServiceConstants.UserStatuses.Invited,
            InvitationToken = oldToken,
            InvitationExpiresAt = DateTime.UtcNow.AddDays(1)
        };

        _repoMock
            .Setup(r => r.GetPendingByEmailAsync(email))
            .ReturnsAsync(pendingUser);
        _repoMock
            .Setup(r => r.UpdateAsync(It.IsAny<string>(), It.IsAny<TenantUser>()))
            .ReturnsAsync(true);

        var result = await _sut.ResendInvitationAsync(email);

        result.Should().NotBeNull();
        result!.InvitationToken.Should().NotBe(oldToken);
        result.InvitationToken!.Length.Should().Be(64);
        result.InvitationExpiresAt.Should().BeAfter(DateTime.UtcNow.AddDays(6));
    }

    [Fact]
    public async Task ResendInvitationAsync_NoPendingInvite_ReturnsNull()
    {
        _repoMock
            .Setup(r => r.GetPendingByEmailAsync(It.IsAny<string>()))
            .ReturnsAsync((TenantUser?)null);

        var result = await _sut.ResendInvitationAsync("nobody@example.com");

        result.Should().BeNull();
    }

    [Fact]
    public async Task ResendInvitationAsync_InviteFromDifferentTenant_ReturnsNull()
    {
        const string email = "bob@example.com";
        var pendingUser = new TenantUser
        {
            TenantId = "other-tenant",
            Email = email,
            Status = ServiceConstants.UserStatuses.Invited
        };

        _repoMock
            .Setup(r => r.GetPendingByEmailAsync(email))
            .ReturnsAsync(pendingUser);

        var result = await _sut.ResendInvitationAsync(email);

        result.Should().BeNull();
    }

    // ─── RevokeInvitationAsync ────────────────────────────────────────────────

    [Fact]
    public async Task RevokeInvitationAsync_ExistingPendingInvite_ReturnsTrue()
    {
        const string userId = "user-id-xyz";
        var pendingUser = new TenantUser
        {
            Id = userId,
            TenantId = TenantId,
            Email = "bob@example.com",
            Status = ServiceConstants.UserStatuses.Invited,
            InvitationToken = "sometoken"
        };

        _repoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(pendingUser);
        _repoMock.Setup(r => r.UpdateAsync(userId, It.IsAny<TenantUser>())).ReturnsAsync(true);

        var result = await _sut.RevokeInvitationAsync(userId);

        result.Should().BeTrue();
    }

    [Fact]
    public async Task RevokeInvitationAsync_ExistingPendingInvite_ClearsToken()
    {
        const string userId = "user-id-xyz";
        TenantUser? captured = null;
        var pendingUser = new TenantUser
        {
            Id = userId,
            TenantId = TenantId,
            Email = "bob@example.com",
            Status = ServiceConstants.UserStatuses.Invited,
            InvitationToken = "sometoken"
        };

        _repoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(pendingUser);
        _repoMock
            .Setup(r => r.UpdateAsync(userId, It.IsAny<TenantUser>()))
            .Callback<string, TenantUser>((_, u) => captured = u)
            .ReturnsAsync(true);

        await _sut.RevokeInvitationAsync(userId);

        captured!.InvitationToken.Should().BeNull();
        captured.InvitationExpiresAt.Should().BeNull();
        captured.Status.Should().Be(ServiceConstants.UserStatuses.Inactive);
    }

    [Fact]
    public async Task RevokeInvitationAsync_UserNotFound_ReturnsFalse()
    {
        _repoMock.Setup(r => r.GetByIdAsync(It.IsAny<string>())).ReturnsAsync((TenantUser?)null);

        var result = await _sut.RevokeInvitationAsync("nonexistent");

        result.Should().BeFalse();
    }

    [Fact]
    public async Task RevokeInvitationAsync_ActiveUser_ReturnsFalse()
    {
        const string userId = "active-user";
        var activeUser = new TenantUser
        {
            Id = userId,
            TenantId = TenantId,
            Status = ServiceConstants.UserStatuses.Active
        };

        _repoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(activeUser);

        var result = await _sut.RevokeInvitationAsync(userId);

        result.Should().BeFalse();
    }
}
