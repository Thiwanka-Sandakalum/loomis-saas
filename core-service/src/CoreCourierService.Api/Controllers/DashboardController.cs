using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using CoreCourierService.Core;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IShipmentService _shipmentService;
    private readonly IPaymentService _paymentService;
    private readonly IComplaintService _complaintService;

    public DashboardController(
        IShipmentService shipmentService,
        IPaymentService paymentService,
        IComplaintService complaintService)
    {
        _shipmentService = shipmentService;
        _paymentService = paymentService;
        _complaintService = complaintService;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var totalShipments = await _shipmentService.GetTotalCountAsync();
        var activeShipments = await _shipmentService.GetActiveCountAsync();
        var deliveredShipments = await _shipmentService.GetCountByStatusAsync("Delivered");
        var totalRevenue = await _paymentService.GetCompletedRevenueAsync();
        var openComplaints = await _complaintService.GetOpenCountAsync();

        var deliveryRate = totalShipments > 0
            ? Math.Round((decimal)deliveredShipments / totalShipments * 100, 2)
            : 0m;

        var overview = new DashboardOverview
        {
            TotalShipments = (int)totalShipments,
            ActiveShipments = (int)activeShipments,
            TotalRevenue = totalRevenue,
            OpenComplaints = (int)openComplaints,
            DeliveryRate = deliveryRate
        };

        return Ok(overview);
    }

    [HttpGet("shipments/stats")]
    public async Task<IActionResult> GetShipmentStats([FromQuery] string period = "month")
    {
        // Limit to 1000 most-recent records; for full analytics use a dedicated aggregation pipeline
        var result = await _shipmentService.GetShipmentsAsync(1, 1000);
        var allShipments = result.shipments.ToList();

        var byStatus = allShipments
            .GroupBy(s => s.Status)
            .ToDictionary(g => g.Key, g => g.Count());

        var byService = allShipments
            .GroupBy(s => s.ServiceType)
            .ToDictionary(g => g.Key, g => g.Count());

        var startDate = period switch
        {
            "today" => DateTime.UtcNow.Date,
            "week" => DateTime.UtcNow.AddDays(-7),
            "month" => DateTime.UtcNow.AddMonths(-1),
            "year" => DateTime.UtcNow.AddYears(-1),
            _ => DateTime.UtcNow.AddMonths(-1)
        };

        var trend = allShipments
            .Where(s => s.CreatedAt >= startDate)
            .GroupBy(s => s.CreatedAt.Date)
            .Select(g => new TrendData
            {
                Date = g.Key.ToString("yyyy-MM-dd"),
                Count = g.Count()
            })
            .OrderBy(t => t.Date)
            .ToList();

        var stats = new ShipmentStats
        {
            Total = allShipments.Count,
            ByStatus = byStatus,
            ByService = byService,
            Trend = trend
        };

        return Ok(stats);
    }

    [HttpGet("revenue/stats")]
    public async Task<IActionResult> GetRevenueStats([FromQuery] string period = "month")
    {
        var allPayments = await _paymentService.GetAllPaymentsAsync();
        var completedPayments = allPayments.Where(p => p.Status == ServiceConstants.PaymentStatuses.Completed).ToList();

        // Limit to 1000 most-recent shipments; for full analytics use a dedicated aggregation pipeline
        var shipmentResult = await _shipmentService.GetShipmentsAsync(1, 1000);
        var allShipments = shipmentResult.shipments.ToList();

        var totalRevenue = completedPayments.Sum(p => p.Amount);

        // Group revenue by service type (join with shipments)
        var revenueByService = completedPayments
            .Join(allShipments,
                payment => payment.TrackingNumber,
                shipment => shipment.TrackingNumber,
                (payment, shipment) => new { payment.Amount, shipment.ServiceType })
            .GroupBy(x => x.ServiceType)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

        var startDate = period switch
        {
            "today" => DateTime.UtcNow.Date,
            "week" => DateTime.UtcNow.AddDays(-7),
            "month" => DateTime.UtcNow.AddMonths(-1),
            "year" => DateTime.UtcNow.AddYears(-1),
            _ => DateTime.UtcNow.AddMonths(-1)
        };

        var trend = completedPayments
            .Where(p => p.CreatedAt >= startDate)
            .GroupBy(p => p.CreatedAt.Date)
            .Select(g => new RevenueTrendData
            {
                Date = g.Key.ToString("yyyy-MM-dd"),
                Amount = g.Sum(p => p.Amount)
            })
            .OrderBy(t => t.Date)
            .ToList();

        var stats = new RevenueStats
        {
            Total = totalRevenue,
            ByService = revenueByService,
            Trend = trend
        };

        return Ok(stats);
    }

    [HttpGet("complaints/stats")]
    public async Task<IActionResult> GetComplaintStats([FromQuery] string period = "month")
    {
        var allComplaints = await _complaintService.GetAllComplaintsAsync();

        var startDate = period switch
        {
            "today" => DateTime.UtcNow.Date,
            "week" => DateTime.UtcNow.AddDays(-7),
            "month" => DateTime.UtcNow.AddMonths(-1),
            "year" => DateTime.UtcNow.AddYears(-1),
            _ => DateTime.UtcNow.AddMonths(-1)
        };

        var periodComplaints = allComplaints
            .Where(c => c.CreatedAt >= startDate)
            .ToList();

        var total = periodComplaints.Count;
        var open = periodComplaints.Count(c => c.Status == "Open" || c.Status == "InProgress");
        var resolved = periodComplaints.Count(c => c.Status == "Resolved" || c.Status == "Closed");

        var byType = periodComplaints
            .GroupBy(c => c.Type)
            .ToDictionary(g => g.Key, g => g.Count());

        // Calculate average resolution time for resolved complaints
        var resolvedComplaintsWithTime = allComplaints
            .Where(c => (c.Status == "Resolved" || c.Status == "Closed") && c.UpdatedAt != default)
            .ToList();

        var resolutionTime = resolvedComplaintsWithTime.Any()
            ? resolvedComplaintsWithTime
                .Average(c => (c.UpdatedAt - c.CreatedAt).TotalHours)
            : 0;

        var stats = new ComplaintStats
        {
            Total = total,
            Open = open,
            Resolved = resolved,
            ByType = byType,
            ResolutionTime = Math.Round(resolutionTime, 2)
        };

        return Ok(stats);
    }
}
