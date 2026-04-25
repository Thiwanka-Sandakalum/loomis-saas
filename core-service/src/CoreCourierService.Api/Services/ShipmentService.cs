using CoreCourierService.Core;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using System.Security.Cryptography;

namespace CoreCourierService.Api.Services;

public class ShipmentService : IShipmentService
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
        shipment.ServiceType = ServiceConstants.ServiceTypes.Canonicalize(shipment.ServiceType);

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

    public async Task<Shipment?> UpdateStatusAsync(string trackingNumber, string newStatus, string location)
    {
        var shipment = await _shipmentRepository.GetByTrackingNumberAsync(trackingNumber);
        if (shipment == null) return null;

        shipment.Status = newStatus;
        shipment.UpdatedAt = DateTime.UtcNow;

        var updated = await _shipmentRepository.UpdateAsync(shipment.Id, shipment);
        return updated ? shipment : null;
    }

    public async Task<long> GetTotalCountAsync()
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _shipmentRepository.CountAsync(s => s.TenantId == tenantId);
    }

    public async Task<long> GetCountByStatusAsync(string status)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _shipmentRepository.CountAsync(s => s.TenantId == tenantId && s.Status == status);
    }

    public async Task<long> GetActiveCountAsync()
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _shipmentRepository.CountAsync(
            s => s.TenantId == tenantId && s.Status != "Delivered" && s.Status != "Cancelled");
    }

    private static string GenerateTrackingNumber()
    {
        var bytes = RandomNumberGenerator.GetBytes(5);
        var suffix = Convert.ToHexString(bytes).ToUpperInvariant();
        return $"LMS-{suffix}";
    }

    private static DateTime CalculateEstimatedDelivery(string serviceType)
    {
        return DateTime.UtcNow.AddDays(ServiceConstants.DeliveryDays.GetDays(serviceType));
    }
}
