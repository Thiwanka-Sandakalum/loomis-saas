using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using CoreCourierService.Core.Entities;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[ApiController]
[Route("api/ai")]
public class AIBrainController : ControllerBase
{
    private readonly ShipmentService _shipmentService;
    private readonly RateService _rateService;
    private readonly ComplaintService _complaintService;
    private readonly ShipmentEventService _eventService;
    private readonly ILogger<AIBrainController> _logger;

    public AIBrainController(
        ShipmentService shipmentService,
        RateService rateService,
        ComplaintService complaintService,
        ShipmentEventService eventService,
        ILogger<AIBrainController> logger)
    {
        _shipmentService = shipmentService;
        _rateService = rateService;
        _complaintService = complaintService;
        _eventService = eventService;
        _logger = logger;
    }

    [HttpPost("shipments/create")]
    public async Task<IActionResult> CreateShipment([FromBody] AICreateShipmentRequest request)
    {
        try
        {
            // Calculate rate first
            var (cost, _, _, estimatedDelivery) = await _rateService.CalculateRateAsync(
                request.ServiceType,
                request.Parcel.Weight);

            // Create shipment
            var shipment = new Shipment
            {
                Sender = request.Sender,
                Receiver = request.Receiver,
                Parcel = request.Parcel,
                ServiceType = request.ServiceType,
                EstimatedDelivery = DateTime.Parse(estimatedDelivery)
            };

            var created = await _shipmentService.CreateShipmentAsync(shipment);

            // Create initial event
            await _eventService.CreateEventAsync(
                created.TrackingNumber,
                "Created",
                request.Sender.City ?? "Origin",
                $"Shipment created via AI Brain (Conversation: {request.ConversationId})");

            var response = new AIShipmentResponse
            {
                Success = true,
                TrackingNumber = created.TrackingNumber,
                EstimatedDelivery = estimatedDelivery,
                Cost = cost,
                Message = $"Shipment created successfully. Tracking number: {created.TrackingNumber}. Estimated delivery: {estimatedDelivery}."
            };

            return CreatedAtAction(nameof(TrackShipment), new { trackingNumber = created.TrackingNumber }, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating shipment via AI Brain");
            return BadRequest(new
            {
                success = false,
                message = $"Failed to create shipment: {ex.Message}"
            });
        }
    }

    [HttpGet("shipments/tracking/{trackingNumber}")]
    public async Task<IActionResult> TrackShipment(string trackingNumber)
    {
        try
        {
            var shipment = await _shipmentService.GetByTrackingNumberAsync(trackingNumber);
            if (shipment == null)
            {
                return NotFound(new
                {
                    trackingNumber,
                    status = "NotFound",
                    summary = $"No shipment found with tracking number {trackingNumber}."
                });
            }

            var events = await _eventService.GetEventsByTrackingNumberAsync(trackingNumber);
            var latestEvent = events.FirstOrDefault();

            var summary = shipment.Status switch
            {
                "Created" => $"Your shipment has been created and is awaiting pickup. Estimated delivery: {shipment.EstimatedDelivery:MMM dd, yyyy}.",
                "PickedUp" => $"Your shipment has been picked up and is on its way. Current location: {latestEvent?.Location}. Estimated delivery: {shipment.EstimatedDelivery:MMM dd, yyyy}.",
                "InTransit" => $"Your shipment is in transit. Current location: {latestEvent?.Location}. Estimated delivery: {shipment.EstimatedDelivery:MMM dd, yyyy}.",
                "OutForDelivery" => $"Your shipment is out for delivery today. Current location: {latestEvent?.Location}.",
                "Delivered" => $"Your shipment was delivered on {latestEvent?.Timestamp:MMM dd, yyyy} at {latestEvent?.Location}.",
                "Cancelled" => "This shipment has been cancelled.",
                _ => $"Status: {shipment.Status}"
            };

            var response = new AITrackingResponse
            {
                TrackingNumber = trackingNumber,
                Status = shipment.Status,
                CurrentLocation = latestEvent?.Location ?? "Unknown",
                LastUpdate = latestEvent?.Timestamp ?? shipment.UpdatedAt,
                EstimatedDelivery = shipment.EstimatedDelivery?.ToString("O").Substring(0, 10) ?? DateTime.UtcNow.ToString("O").Substring(0, 10),
                Summary = summary
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking shipment {TrackingNumber}", trackingNumber);
            return BadRequest(new { summary = $"Error retrieving tracking information: {ex.Message}" });
        }
    }

    [HttpPost("rates/inquiry")]
    public async Task<IActionResult> RateInquiry([FromBody] AIRateInquiryRequest request)
    {
        try
        {
            var (cost, baseRate, additionalCharges, estimatedDelivery) =
                await _rateService.CalculateRateAsync(request.ServiceType, request.Weight);

            var explanation = $"The cost for {request.ServiceType} service with {request.Weight}kg is ${cost:F2}. " +
                            $"This includes a base rate of ${baseRate:F2} and additional charges of ${additionalCharges:F2}. " +
                            $"Estimated delivery date is {estimatedDelivery}.";

            var response = new AIRateInquiryResponse
            {
                ServiceType = request.ServiceType,
                Cost = cost,
                EstimatedDelivery = estimatedDelivery,
                Explanation = explanation
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating rate");
            return BadRequest(new { explanation = $"Error calculating rate: {ex.Message}" });
        }
    }

    [HttpPost("complaints/file")]
    public async Task<IActionResult> FileComplaint([FromBody] AIFileComplaintRequest request)
    {
        try
        {
            // Determine complaint type from description if not provided
            var complaintType = request.Type ?? DetermineComplaintType(request.Description);

            var complaint = await _complaintService.CreateComplaintAsync(
                request.TrackingNumber,
                complaintType,
                request.Description,
                null,
                request.CustomerContact);

            var message = $"Your complaint has been filed successfully. Complaint ID: {complaint.Id}. " +
                        $"A customer service representative will review your complaint and contact you shortly.";

            var response = new AIComplaintResponse
            {
                ComplaintId = complaint.Id,
                Status = complaint.Status,
                Message = message
            };

            return CreatedAtAction(nameof(FileComplaint), new { complaintId = complaint.Id }, response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error filing complaint");
            return BadRequest(new { message = $"Error filing complaint: {ex.Message}" });
        }
    }

    [HttpGet("customers/{phoneOrEmail}")]
    public async Task<IActionResult> LookupCustomer(string phoneOrEmail)
    {
        try
        {
            // Search for shipments with this contact info
            var result = await _shipmentService.GetShipmentsAsync(1, 10);
            var shipments = result.shipments.ToList();

            var customerShipments = shipments
                .Where(s => s.Sender.Phone == phoneOrEmail ||
                           s.Sender.Email == phoneOrEmail ||
                           s.Receiver.Phone == phoneOrEmail ||
                           s.Receiver.Email == phoneOrEmail)
                .ToList();

            if (!customerShipments.Any())
            {
                return Ok(new AICustomerResponse
                {
                    Found = false,
                    RecentShipments = new List<RecentShipment>()
                });
            }

            var firstShipment = customerShipments.First();
            var isSender = firstShipment.Sender.Phone == phoneOrEmail || firstShipment.Sender.Email == phoneOrEmail;
            var contact = isSender ? firstShipment.Sender : firstShipment.Receiver;

            var response = new AICustomerResponse
            {
                Found = true,
                Customer = new CustomerInfo
                {
                    Id = phoneOrEmail,
                    Name = contact.Name,
                    Email = contact.Email ?? "",
                    Phone = contact.Phone
                },
                RecentShipments = customerShipments
                    .OrderByDescending(s => s.CreatedAt)
                    .Take(5)
                    .Select(s => new RecentShipment
                    {
                        TrackingNumber = s.TrackingNumber,
                        Status = s.Status,
                        CreatedAt = s.CreatedAt
                    })
                    .ToList()
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error looking up customer");
            return BadRequest(new { found = false });
        }
    }

    private string DetermineComplaintType(string description)
    {
        var lowerDesc = description.ToLower();

        if (lowerDesc.Contains("delay") || lowerDesc.Contains("late") || lowerDesc.Contains("slow"))
            return "Delay";

        if (lowerDesc.Contains("damage") || lowerDesc.Contains("broken") || lowerDesc.Contains("destroyed"))
            return "Damage";

        if (lowerDesc.Contains("lost") || lowerDesc.Contains("missing") || lowerDesc.Contains("cannot find"))
            return "Lost";

        return "Other";
    }
}
