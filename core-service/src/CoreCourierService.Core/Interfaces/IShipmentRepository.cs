using CoreCourierService.Core.Entities;

namespace CoreCourierService.Core.Interfaces;

public interface IShipmentRepository : IRepository<Shipment>
{
    Task<Shipment?> GetByTrackingNumberAsync(string trackingNumber);
}
