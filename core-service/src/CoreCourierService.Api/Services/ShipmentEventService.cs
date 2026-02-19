using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;

namespace CoreCourierService.Api.Services;

public class ShipmentEventService
{
    private readonly IShipmentEventRepository _eventRepository;
    private readonly IShipmentRepository _shipmentRepository;
    private readonly ITenantContext _tenantContext;

    public ShipmentEventService(
        IShipmentEventRepository eventRepository,
        IShipmentRepository shipmentRepository,
        ITenantContext tenantContext)
    {
        _eventRepository = eventRepository;
        _shipmentRepository = shipmentRepository;
        _tenantContext = tenantContext;
    }

    public async Task<ShipmentEvent> CreateEventAsync(string trackingNumber, string status, string location, string? notes)
    {
        // Verify shipment exists
        var shipment = await _shipmentRepository.GetByTrackingNumberAsync(trackingNumber);
        if (shipment == null)
            throw new Exception($"Shipment not found: {trackingNumber}");

        var shipmentEvent = new ShipmentEvent
        {
            TrackingNumber = trackingNumber,
            Status = status,
            Location = location,
            Notes = notes,
            Timestamp = DateTime.UtcNow
        };

        return await _eventRepository.CreateEventAsync(shipmentEvent);
    }

    public async Task<List<ShipmentEvent>> GetEventsByTrackingNumberAsync(string trackingNumber)
    {
        return await _eventRepository.GetByTrackingNumberAsync(trackingNumber);
    }
}
