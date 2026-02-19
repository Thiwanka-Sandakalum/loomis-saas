using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace CoreCourierService.Infrastructure.Repositories;

public class TenantRepository : MongoRepository<Tenant>, ITenantRepository
{
    public TenantRepository(IOptions<MongoDbSettings> settings)
        : base(settings, tenantContext: null) // Tenants are not tenant-scoped
    {
    }

    public async Task<Tenant?> GetByApiKeyAsync(string apiKey)
    {
        var filter = Builders<Tenant>.Filter.Eq(t => t.ApiKey, apiKey)
                   & Builders<Tenant>.Filter.Eq(t => t.IsActive, true);
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }
}
