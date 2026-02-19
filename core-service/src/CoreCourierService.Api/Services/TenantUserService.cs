using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;

namespace CoreCourierService.Api.Services;

public class TenantUserService
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
            Status = "active",
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

        // Create pending tenant user (Auth0UserId will be filled when they sign up)
        var tenantUser = new TenantUser
        {
            Auth0UserId = $"pending_{Guid.NewGuid():N}", // Temporary ID
            TenantId = tenantId,
            Email = email,
            Role = role,
            Status = "invited",
            InvitedAt = DateTime.UtcNow,
            InvitedBy = invitedBy
        };

        await _tenantUserRepository.CreateAsync(tenantUser);

        // TODO: Send invitation email via Auth0 or your email service

        _logger.LogInformation(
            "Invited user {Email} to tenant {TenantId} with role {Role}",
            email, tenantId, role);

        return tenantUser;
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
        var tenantUser = await _tenantUserRepository.GetByIdAsync(tenantUserId);
        if (tenantUser == null)
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
        return await _tenantUserRepository.DeleteAsync(tenantUserId);
    }

    /// <summary>
    /// Get tenant user by Auth0 User ID
    /// </summary>
    public async Task<TenantUser?> GetByAuth0UserIdAsync(string auth0UserId)
    {
        return await _tenantUserRepository.GetByAuth0UserIdAsync(auth0UserId);
    }
}
