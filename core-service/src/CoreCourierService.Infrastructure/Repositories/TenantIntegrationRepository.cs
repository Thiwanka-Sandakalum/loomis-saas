using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace CoreCourierService.Infrastructure.Repositories;

public class TenantIntegrationRepository : MongoRepository<TenantIntegration>, ITenantIntegrationRepository
{
    public TenantIntegrationRepository(
        IOptions<MongoDbSettings> settings,
        ITenantContext tenantContext)
        : base(settings, tenantContext)
    {
    }

    public async Task<TenantIntegration?> GetByTenantIdAndTypeAsync(string tenantId, string integrationType)
    {
        var filter = Builders<TenantIntegration>.Filter.And(
            Builders<TenantIntegration>.Filter.Eq(i => i.TenantId, tenantId),
            Builders<TenantIntegration>.Filter.Eq(i => i.IntegrationType, integrationType)
        );

        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<List<TenantIntegration>> GetActiveIntegrationsByTypeAsync(string integrationType)
    {
        var filter = Builders<TenantIntegration>.Filter.And(
            Builders<TenantIntegration>.Filter.Eq(i => i.IntegrationType, integrationType),
            Builders<TenantIntegration>.Filter.Eq(i => i.IsActive, true)
        );

        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<List<TenantIntegration>> GetByTenantIdAsync(string tenantId)
    {
        var filter = Builders<TenantIntegration>.Filter.Eq(i => i.TenantId, tenantId);
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<bool> ExistsAsync(string tenantId, string integrationType)
    {
        var filter = Builders<TenantIntegration>.Filter.And(
            Builders<TenantIntegration>.Filter.Eq(i => i.TenantId, tenantId),
            Builders<TenantIntegration>.Filter.Eq(i => i.IntegrationType, integrationType)
        );

        var count = await _collection.CountDocumentsAsync(filter);
        return count > 0;
    }
}
