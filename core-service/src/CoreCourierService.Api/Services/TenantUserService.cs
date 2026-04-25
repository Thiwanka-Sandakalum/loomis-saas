using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Core;
using System.Security.Cryptography;

namespace CoreCourierService.Api.Services;

public class TenantUserService : ITenantUserService
{
    private readonly ITenantUserRepository _tenantUserRepository;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<TenantUserService> _logger;

    public TenantUserService(
        ITenantUserRepository tenantUserRepository,
        ITenantContext tenantContext,
        ILogger<TenantUserService> logger)
    {
        _tenantUserRepository = tenantUserRepository;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// Create a new tenant user mapping (when user signs up via Auth0)
    /// </summary>
    public async Task<TenantUser> CreateTenantUserAsync(
        string auth0UserId,
        string email,
        string role,
        string? name = null,
        string? invitedBy = null)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");

        // Check if mapping already exists
        var existing = await _tenantUserRepository.ExistsAsync(auth0UserId, tenantId);
        if (existing)
        {
            throw new InvalidOperationException("User already belongs to this tenant");
        }

        var tenantUser = new TenantUser
        {
            Auth0UserId = auth0UserId,
            TenantId = tenantId,
            Email = email,
            Name = name,
            Role = role,
            Status = ServiceConstants.UserStatuses.Active,
            InvitedAt = DateTime.UtcNow,
            InvitedBy = invitedBy
        };

        await _tenantUserRepository.CreateAsync(tenantUser);

        _logger.LogInformation(
            "Created tenant user mapping: {Auth0UserId} → Tenant {TenantId} with role {Role}",
            auth0UserId, tenantId, role);

        return tenantUser;
    }

    /// <summary>
    /// Invite a user to join the tenant (creates pending mapping)
    /// </summary>
    public async Task<TenantUser> InviteUserAsync(
        string email,
        string role,
        string invitedBy)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");

        // Duplicate prevention: reject if the email already has an active or pending record in this tenant
        var existing = await _tenantUserRepository.GetPendingByEmailAsync(email);
        if (existing != null && existing.TenantId == tenantId)
        {
            throw new InvalidOperationException($"An invitation or active account already exists for {email} in this tenant.");
        }

        var invitationToken = GenerateInvitationToken();
        var invitationExpiresAt = DateTime.UtcNow.AddDays(7);

        // Create pending tenant user (Auth0UserId will be filled when they sign up)
        var tenantUser = new TenantUser
        {
            Auth0UserId = $"pending_{Guid.NewGuid():N}", // Temporary ID
            TenantId = tenantId,
            Email = email,
            Role = role,
            Status = ServiceConstants.UserStatuses.Invited,
            InvitedAt = DateTime.UtcNow,
            InvitedBy = invitedBy,
            InvitationToken = invitationToken,
            InvitationExpiresAt = invitationExpiresAt
        };

        await _tenantUserRepository.CreateAsync(tenantUser);

        // TODO: Send invitation email via Auth0 or your email service

        _logger.LogInformation(
            "Invited user {Email} to tenant {TenantId} with role {Role}",
            email, tenantId, role);

        return tenantUser;
    }

    /// <summary>
    /// Resend an invitation: generates a fresh token and resets the expiry.
    /// Returns null if no pending invitation exists for this email.
    /// </summary>
    public async Task<TenantUser?> ResendInvitationAsync(string email)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");

        var pendingUser = await _tenantUserRepository.GetPendingByEmailAsync(email);
        if (pendingUser == null || pendingUser.TenantId != tenantId
            || pendingUser.Status != ServiceConstants.UserStatuses.Invited)
        {
            return null;
        }

        pendingUser.InvitationToken = GenerateInvitationToken();
        pendingUser.InvitationExpiresAt = DateTime.UtcNow.AddDays(7);
        pendingUser.UpdatedAt = DateTime.UtcNow;

        await _tenantUserRepository.UpdateAsync(pendingUser.Id, pendingUser);

        // TODO: Resend invitation email

        _logger.LogInformation(
            "Resent invitation for {Email} in tenant {TenantId}",
            email, tenantId);

        return pendingUser;
    }

    /// <summary>
    /// Revoke a pending invitation by marking its record as inactive.
    /// Returns false if the record is not found or is not in Invited status.
    /// </summary>
    public async Task<bool> RevokeInvitationAsync(string tenantUserId)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");

        var pendingUser = await _tenantUserRepository.GetByIdAsync(tenantUserId);
        if (pendingUser == null || pendingUser.TenantId != tenantId
            || pendingUser.Status != ServiceConstants.UserStatuses.Invited)
        {
            return false;
        }

        pendingUser.Status = ServiceConstants.UserStatuses.Inactive;
        pendingUser.InvitationToken = null;
        pendingUser.InvitationExpiresAt = null;
        pendingUser.UpdatedAt = DateTime.UtcNow;

        var updated = await _tenantUserRepository.UpdateAsync(pendingUser.Id, pendingUser);

        if (updated)
        {
            _logger.LogInformation(
                "Revoked invitation for {Email} (id: {Id}) in tenant {TenantId}",
                pendingUser.Email, tenantUserId, tenantId);
        }

        return updated;
    }

    /// <summary>
    /// Get all users for the current tenant
    /// </summary>
    public async Task<IEnumerable<TenantUser>> GetTenantUsersAsync()
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");

        return await _tenantUserRepository.GetByTenantIdAsync(tenantId);
    }

    /// <summary>
    /// Update user role within tenant
    /// </summary>
    public async Task<bool> UpdateUserRoleAsync(string tenantUserId, string newRole)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");

        var tenantUser = await _tenantUserRepository.GetByIdAsync(tenantUserId);
        if (tenantUser == null || tenantUser.TenantId != tenantId)
        {
            return false;
        }

        tenantUser.Role = newRole;
        tenantUser.UpdatedAt = DateTime.UtcNow;

        return await _tenantUserRepository.UpdateAsync(tenantUser.Id, tenantUser);
    }

    /// <summary>
    /// Remove user from tenant
    /// </summary>
    public async Task<bool> RemoveUserAsync(string tenantUserId)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");

        var tenantUser = await _tenantUserRepository.GetByIdAsync(tenantUserId);
        if (tenantUser == null || tenantUser.TenantId != tenantId)
        {
            return false;
        }

        return await _tenantUserRepository.DeleteAsync(tenantUserId);
    }

    /// <summary>
    /// Get tenant user by Auth0 User ID
    /// </summary>
    public async Task<TenantUser?> GetByAuth0UserIdAsync(string auth0UserId)
    {
        return await _tenantUserRepository.GetByAuth0UserIdAsync(auth0UserId);
    }

    /// <summary>
    /// Accept a pending invitation: link the real Auth0 user ID to the pending record and activate it.
    /// Returns the updated TenantUser, or null if no matching invitation is found.
    /// </summary>
    public async Task<TenantUser?> AcceptInvitationAsync(string auth0UserId, string email, string invitationToken)
    {
        var pendingUser = await _tenantUserRepository.GetPendingInvitationAsync(email, invitationToken);
        if (pendingUser == null)
        {
            return null;
        }

        pendingUser.Auth0UserId = auth0UserId;
        pendingUser.Status = ServiceConstants.UserStatuses.Active;
        pendingUser.UpdatedAt = DateTime.UtcNow;
        pendingUser.InvitationToken = null;
        pendingUser.InvitationExpiresAt = null;

        await _tenantUserRepository.UpdateAsync(pendingUser.Id, pendingUser);

        _logger.LogInformation(
            "Invitation accepted: {Auth0UserId} joined tenant {TenantId} as {Role}",
            auth0UserId, pendingUser.TenantId, pendingUser.Role);

        return pendingUser;
    }

    private static string GenerateInvitationToken()
    {
        return Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
    }
}
