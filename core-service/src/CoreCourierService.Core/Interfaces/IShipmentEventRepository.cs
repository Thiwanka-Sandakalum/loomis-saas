using CoreCourierService.Core.Entities;

namespace CoreCourierService.Core.Interfaces;

public interface IShipmentEventRepository : IRepository<ShipmentEvent>
{
    Task<List<ShipmentEvent>> GetByTrackingNumberAsync(string trackingNumber);
    Task<ShipmentEvent> CreateEventAsync(ShipmentEvent shipmentEvent);
}
