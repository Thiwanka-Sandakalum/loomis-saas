using CoreCourierService.Core.Entities;

namespace CoreCourierService.Core.Interfaces;

public interface ITenantUserRepository : IRepository<TenantUser>
{
    /// <summary>
    /// Find tenant user mapping by Auth0 User ID
    /// </summary>
    Task<TenantUser?> GetByAuth0UserIdAsync(string auth0UserId);

    /// <summary>
    /// Find all tenant users for a specific tenant
    /// </summary>
    Task<IEnumerable<TenantUser>> GetByTenantIdAsync(string tenantId);

    /// <summary>
    /// Check if an Auth0 user already belongs to a tenant
    /// </summary>
    Task<bool> ExistsAsync(string auth0UserId, string tenantId);
}
