using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace CoreCourierService.Infrastructure.Repositories;

public class TenantUserRepository : MongoRepository<TenantUser>, ITenantUserRepository
{
    public TenantUserRepository(
        IOptions<MongoDbSettings> settings,
        ITenantContext tenantContext)
        : base(settings, tenantContext)
    {
    }

    public async Task<TenantUser?> GetByAuth0UserIdAsync(string auth0UserId)
    {
        // Note: No tenant filtering here - we need to find which tenant(s) the user belongs to
        var filter = Builders<TenantUser>.Filter.Eq(u => u.Auth0UserId, auth0UserId);
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<IEnumerable<TenantUser>> GetByTenantIdAsync(string tenantId)
    {
        var filter = Builders<TenantUser>.Filter.Eq(u => u.TenantId, tenantId);
        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<bool> ExistsAsync(string auth0UserId, string tenantId)
    {
        var filter = Builders<TenantUser>.Filter.And(
            Builders<TenantUser>.Filter.Eq(u => u.Auth0UserId, auth0UserId),
            Builders<TenantUser>.Filter.Eq(u => u.TenantId, tenantId)
        );
        return await _collection.Find(filter).AnyAsync();
    }
}
