using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace CoreCourierService.Infrastructure.Repositories;

public class PaymentRepository : MongoRepository<Payment>, IPaymentRepository
{
    public PaymentRepository(
        IOptions<MongoDbSettings> settings,
        ITenantContext tenantContext)
        : base(settings, tenantContext)
    {
    }

    public async Task<List<Payment>> GetByTrackingNumberAsync(string trackingNumber)
    {
        var filter = Builders<Payment>.Filter.Eq(p => p.TrackingNumber, trackingNumber);
        filter = ApplyTenantFilter(filter);

        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<List<Payment>> GetByStatusAsync(string status, int pageNumber, int pageSize)
    {
        var filter = Builders<Payment>.Filter.Eq(p => p.Status, status);
        filter = ApplyTenantFilter(filter);

        return await _collection.Find(filter)
            .Skip((pageNumber - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();
    }
}
