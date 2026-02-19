using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[ApiController]
[Route("api/complaints")]
public class ComplaintsController : ControllerBase
{
    private readonly ComplaintService _complaintService;

    public ComplaintsController(ComplaintService complaintService)
    {
        _complaintService = complaintService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateComplaint([FromBody] CreateComplaintRequest request)
    {
        try
        {
            var complaint = await _complaintService.CreateComplaintAsync(
                request.TrackingNumber,
                request.Type,
                request.Description,
                request.CustomerEmail,
                request.CustomerPhone);

            return CreatedAtAction(nameof(GetComplaint), new { complaintId = complaint.Id }, complaint);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = new { code = "COMPLAINT_ERROR", message = ex.Message } });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetComplaints(
        [FromQuery] string? status,
        [FromQuery] string? type,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (!string.IsNullOrEmpty(status))
        {
            var complaints = await _complaintService.GetComplaintsByStatusAsync(status, page, pageSize);
            return Ok(new { data = complaints, pagination = new { page, pageSize } });
        }

        if (!string.IsNullOrEmpty(type))
        {
            var complaints = await _complaintService.GetComplaintsByTypeAsync(type, page, pageSize);
            return Ok(new { data = complaints, pagination = new { page, pageSize } });
        }

        // TODO: Implement GetAll with pagination
        return Ok(new { data = new List<object>(), pagination = new { page, pageSize } });
    }

    [HttpGet("{complaintId}")]
    public async Task<IActionResult> GetComplaint(string complaintId)
    {
        var complaint = await _complaintService.GetComplaintByIdAsync(complaintId);
        if (complaint == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Complaint not found" } });

        return Ok(complaint);
    }

    [HttpGet("shipment/{trackingNumber}")]
    public async Task<IActionResult> GetComplaintsByShipment(string trackingNumber)
    {
        var complaints = await _complaintService.GetComplaintsByTrackingNumberAsync(trackingNumber);
        return Ok(new { data = complaints });
    }

    [HttpPatch("{complaintId}")]
    public async Task<IActionResult> UpdateComplaint(string complaintId, [FromBody] UpdateComplaintRequest request)
    {
        var complaint = await _complaintService.UpdateComplaintAsync(
            complaintId,
            request.Status,
            request.Resolution,
            request.AssignedTo);

        if (complaint == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Complaint not found" } });

        return Ok(complaint);
    }
}
