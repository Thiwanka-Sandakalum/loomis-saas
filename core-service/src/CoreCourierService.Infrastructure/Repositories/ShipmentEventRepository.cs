using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace CoreCourierService.Infrastructure.Repositories;

public class ShipmentEventRepository : MongoRepository<ShipmentEvent>, IShipmentEventRepository
{
    public ShipmentEventRepository(
        IOptions<MongoDbSettings> settings,
        ITenantContext tenantContext)
        : base(settings, tenantContext)
    {
    }

    public async Task<List<ShipmentEvent>> GetByTrackingNumberAsync(string trackingNumber)
    {
        var filter = Builders<ShipmentEvent>.Filter.Eq(e => e.TrackingNumber, trackingNumber);
        filter = ApplyTenantFilter(filter);

        return await _collection
            .Find(filter)
            .SortByDescending(e => e.Timestamp)
            .ToListAsync();
    }

    public async Task<ShipmentEvent> CreateEventAsync(ShipmentEvent shipmentEvent)
    {
        if (_tenantContext != null)
        {
            shipmentEvent.TenantId = _tenantContext.TenantId;
        }
        shipmentEvent.CreatedAt = DateTime.UtcNow;
        shipmentEvent.UpdatedAt = DateTime.UtcNow;
        shipmentEvent.Timestamp = DateTime.UtcNow;

        await _collection.InsertOneAsync(shipmentEvent);
        return shipmentEvent;
    }
}
