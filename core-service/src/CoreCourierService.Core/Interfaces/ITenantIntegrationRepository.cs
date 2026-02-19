using CoreCourierService.Core.Entities;

namespace CoreCourierService.Core.Interfaces;

public interface ITenantIntegrationRepository : IRepository<TenantIntegration>
{
    Task<TenantIntegration?> GetByTenantIdAndTypeAsync(string tenantId, string integrationType);
    Task<List<TenantIntegration>> GetActiveIntegrationsByTypeAsync(string integrationType);
    Task<List<TenantIntegration>> GetByTenantIdAsync(string tenantId);
    Task<bool> ExistsAsync(string tenantId, string integrationType);
}
