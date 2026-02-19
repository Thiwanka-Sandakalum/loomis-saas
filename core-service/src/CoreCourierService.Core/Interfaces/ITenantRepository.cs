using CoreCourierService.Core.Entities;

namespace CoreCourierService.Core.Interfaces;

public interface ITenantRepository : IRepository<Tenant>
{
    Task<Tenant?> GetByApiKeyAsync(string apiKey);
}
