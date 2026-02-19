using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace CoreCourierService.Infrastructure.Repositories;

public class RateRepository : MongoRepository<Rate>, IRateRepository
{
    public RateRepository(
        IOptions<MongoDbSettings> settings,
        ITenantContext tenantContext)
        : base(settings, tenantContext)
    {
    }

    public async Task<Rate?> GetByServiceTypeAsync(string serviceType)
    {
        var filter = Builders<Rate>.Filter.Eq(r => r.ServiceType, serviceType);
        filter = ApplyTenantFilter(filter);

        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<List<Rate>> GetAllRatesAsync()
    {
        var filter = ApplyTenantFilter();
        return await _collection.Find(filter).ToListAsync();
    }
}
