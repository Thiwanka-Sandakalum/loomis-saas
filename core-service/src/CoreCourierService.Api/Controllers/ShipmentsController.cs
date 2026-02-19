using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using CoreCourierService.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[ApiController]
[Route("api/shipments")]
public class ShipmentsController : ControllerBase
{
    private readonly ShipmentService _shipmentService;
    private readonly ShipmentEventService _eventService;
    private readonly ILogger<ShipmentsController> _logger;

    public ShipmentsController(
        ShipmentService shipmentService,
        ShipmentEventService eventService,
        ILogger<ShipmentsController> logger)
    {
        _shipmentService = shipmentService;
        _eventService = eventService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<ShipmentResponse>> CreateShipment([FromBody] CreateShipmentRequest request)
    {
        var shipment = new Shipment
        {
            Sender = request.Sender,
            Receiver = request.Receiver,
            Parcel = request.Parcel,
            ServiceType = request.ServiceType,
            SpecialInstructions = request.SpecialInstructions
        };

        var created = await _shipmentService.CreateShipmentAsync(shipment);

        var response = new ShipmentResponse(
            created.Id,
            created.TrackingNumber,
            created.Sender,
            created.Receiver,
            created.Parcel,
            created.ServiceType,
            created.Status,
            created.EstimatedDelivery,
            created.CreatedAt);

        return CreatedAtAction(nameof(GetByTrackingNumber), new { trackingNumber = created.TrackingNumber }, response);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResponse<ShipmentResponse>>> GetShipments(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null)
    {
        var (shipments, total) = await _shipmentService.GetShipmentsAsync(page, pageSize, status);

        var data = shipments.Select(s => new ShipmentResponse(
            s.Id,
            s.TrackingNumber,
            s.Sender,
            s.Receiver,
            s.Parcel,
            s.ServiceType,
            s.Status,
            s.EstimatedDelivery,
            s.CreatedAt));

        var pagination = new PaginationMeta(
            page,
            pageSize,
            (long)Math.Ceiling(total / (double)pageSize),
            total);

        return Ok(new PagedResponse<ShipmentResponse>(data, pagination));
    }

    [HttpGet("tracking/{trackingNumber}")]
    [AllowAnonymous]
    public async Task<ActionResult<ShipmentResponse>> GetByTrackingNumber(string trackingNumber)
    {
        var shipment = await _shipmentService.GetByTrackingNumberAsync(trackingNumber);

        if (shipment == null)
            return NotFound(new { error = "Shipment not found", trackingNumber });

        var response = new ShipmentResponse(
            shipment.Id,
            shipment.TrackingNumber,
            shipment.Sender,
            shipment.Receiver,
            shipment.Parcel,
            shipment.ServiceType,
            shipment.Status,
            shipment.EstimatedDelivery,
            shipment.CreatedAt);

        return Ok(response);
    }

    [HttpPatch("tracking/{trackingNumber}/status")]
    public async Task<ActionResult<ShipmentResponse>> UpdateStatus(
        string trackingNumber,
        [FromBody] UpdateStatusRequest request)
    {
        var updated = await _shipmentService.UpdateStatusAsync(
            trackingNumber,
            request.Status,
            request.Location);

        if (!updated)
            return NotFound(new { error = "Shipment not found", trackingNumber });

        var shipment = await _shipmentService.GetByTrackingNumberAsync(trackingNumber);

        var response = new ShipmentResponse(
            shipment!.Id,
            shipment.TrackingNumber,
            shipment.Sender,
            shipment.Receiver,
            shipment.Parcel,
            shipment.ServiceType,
            shipment.Status,
            shipment.EstimatedDelivery,
            shipment.CreatedAt);

        return Ok(response);
    }

    [HttpPost("{trackingNumber}/events")]
    public async Task<IActionResult> AddShipmentEvent(
        string trackingNumber,
        [FromBody] CreateEventRequest request)
    {
        try
        {
            var shipmentEvent = await _eventService.CreateEventAsync(
                trackingNumber,
                request.Status,
                request.Location,
                request.Notes);

            return CreatedAtAction(nameof(GetShipmentEvents), new { trackingNumber }, shipmentEvent);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = new { code = "EVENT_ERROR", message = ex.Message } });
        }
    }

    [HttpGet("{trackingNumber}/events")]
    public async Task<IActionResult> GetShipmentEvents(string trackingNumber)
    {
        var events = await _eventService.GetEventsByTrackingNumberAsync(trackingNumber);
        return Ok(new { data = events });
    }

    [HttpGet("{shipmentId}/status-history")]
    public async Task<IActionResult> GetStatusHistory(string shipmentId)
    {
        var shipment = await _shipmentService.GetShipmentByIdAsync(shipmentId);
        if (shipment == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Shipment not found" } });

        var events = await _eventService.GetEventsByTrackingNumberAsync(shipment.TrackingNumber);
        return Ok(new { data = events });
    }
}
