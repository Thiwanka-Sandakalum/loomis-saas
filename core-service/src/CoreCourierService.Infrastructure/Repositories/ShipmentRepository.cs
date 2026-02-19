using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace CoreCourierService.Infrastructure.Repositories;

public class ShipmentRepository : MongoRepository<Shipment>, IShipmentRepository
{
    public ShipmentRepository(IOptions<MongoDbSettings> settings, ITenantContext tenantContext)
        : base(settings, tenantContext)
    {
    }

    public async Task<Shipment?> GetByTrackingNumberAsync(string trackingNumber)
    {
        var filter = Builders<Shipment>.Filter.Eq(s => s.TrackingNumber, trackingNumber);
        filter = ApplyTenantFilter(filter);
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }
}
