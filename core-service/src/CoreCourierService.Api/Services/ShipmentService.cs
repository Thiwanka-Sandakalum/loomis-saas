using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;

namespace CoreCourierService.Api.Services;

public class ShipmentService
{
    private readonly IShipmentRepository _shipmentRepository;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<ShipmentService> _logger;

    public ShipmentService(
        IShipmentRepository shipmentRepository,
        ITenantContext tenantContext,
        ILogger<ShipmentService> logger)
    {
        _shipmentRepository = shipmentRepository;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<Shipment> CreateShipmentAsync(Shipment shipment)
    {
        // Generate tracking number
        shipment.TrackingNumber = GenerateTrackingNumber();

        // Calculate estimated delivery based on service type
        shipment.EstimatedDelivery = CalculateEstimatedDelivery(shipment.ServiceType);

        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        _logger.LogInformation(
            "Creating shipment {TrackingNumber} for tenant {TenantId}",
            shipment.TrackingNumber,
            tenantId);
        shipment.TenantId = tenantId;
        return await _shipmentRepository.CreateAsync(shipment);
    }

    public async Task<Shipment?> GetByTrackingNumberAsync(string trackingNumber)
    {
        return await _shipmentRepository.GetByTrackingNumberAsync(trackingNumber);
    }

    public async Task<Shipment?> GetShipmentByIdAsync(string id)
    {
        return await _shipmentRepository.GetByIdAsync(id);
    }

    public async Task<(IEnumerable<Shipment> shipments, long total)> GetShipmentsAsync(
        int page, int pageSize, string? status = null)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _shipmentRepository.GetPagedAsync(
            filter: s => s.TenantId == tenantId && (status != null ? s.Status == status : true),
            page: page,
            pageSize: pageSize,
            orderBy: s => s.CreatedAt);
    }

    public async Task<bool> UpdateStatusAsync(string trackingNumber, string newStatus, string location)
    {
        var shipment = await _shipmentRepository.GetByTrackingNumberAsync(trackingNumber);
        if (shipment == null) return false;

        shipment.Status = newStatus;
        shipment.UpdatedAt = DateTime.UtcNow;

        return await _shipmentRepository.UpdateAsync(shipment.Id, shipment);
    }

    private static string GenerateTrackingNumber()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var random = new Random();
        var suffix = new string(Enumerable.Repeat(chars, 8)
            .Select(s => s[random.Next(s.Length)]).ToArray());
        return $"LMS-{suffix}";
    }

    private static DateTime CalculateEstimatedDelivery(string serviceType)
    {
        return serviceType switch
        {
            "Express" => DateTime.UtcNow.AddDays(2),
            "Overnight" => DateTime.UtcNow.AddDays(1),
            _ => DateTime.UtcNow.AddDays(5) // Standard
        };
    }
}
