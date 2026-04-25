using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/complaints")]
public class ComplaintsController : ControllerBase
{
    private readonly IComplaintService _complaintService;

    public ComplaintsController(IComplaintService complaintService)
    {
        _complaintService = complaintService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateComplaint([FromBody] CreateComplaintRequest request)
    {
        var complaint = await _complaintService.CreateComplaintAsync(
            request.TrackingNumber,
            request.Type,
            request.Description,
            request.CustomerEmail,
            request.CustomerPhone);

        return CreatedAtAction(nameof(GetComplaint), new { complaintId = complaint.Id }, complaint);
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

        var (allComplaints, total) = await _complaintService.GetAllPagedAsync(page, pageSize);
        return Ok(new { data = allComplaints, pagination = new { page, pageSize, total } });
    }

    [HttpGet("{complaintId}")]
    public async Task<IActionResult> GetComplaint(string complaintId)
    {
        var complaint = await _complaintService.GetComplaintByIdAsync(complaintId);
        if (complaint == null)
            return NotFound(ApiErrors.Create("NOT_FOUND", "Complaint not found"));

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
            return NotFound(ApiErrors.Create("NOT_FOUND", "Complaint not found"));

        return Ok(complaint);
    }
}
