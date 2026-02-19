using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;

namespace CoreCourierService.Api.Services;

public class ComplaintService
{
    private readonly IComplaintRepository _complaintRepository;
    private readonly IShipmentRepository _shipmentRepository;
    private readonly ITenantContext _tenantContext;

    public ComplaintService(
        IComplaintRepository complaintRepository,
        IShipmentRepository shipmentRepository,
        ITenantContext tenantContext)
    {
        _complaintRepository = complaintRepository;
        _shipmentRepository = shipmentRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Complaint> CreateComplaintAsync(
        string trackingNumber,
        string type,
        string description,
        string? customerEmail,
        string? customerPhone)
    {
        // Verify shipment exists
        var shipment = await _shipmentRepository.GetByTrackingNumberAsync(trackingNumber);
        if (shipment == null)
            throw new Exception($"Shipment not found: {trackingNumber}");

        var complaint = new Complaint
        {
            TrackingNumber = trackingNumber,
            Type = type,
            Description = description,
            Status = "Open",
            CustomerEmail = customerEmail,
            CustomerPhone = customerPhone
        };

        return await _complaintRepository.CreateAsync(complaint);
    }

    public async Task<Complaint?> GetComplaintByIdAsync(string id)
    {
        return await _complaintRepository.GetByIdAsync(id);
    }

    public async Task<List<Complaint>> GetComplaintsByTrackingNumberAsync(string trackingNumber)
    {
        return await _complaintRepository.GetByTrackingNumberAsync(trackingNumber);
    }

    public async Task<List<Complaint>> GetComplaintsByStatusAsync(string status, int pageNumber, int pageSize)
    {
        return await _complaintRepository.GetByStatusAsync(status, pageNumber, pageSize);
    }

    public async Task<List<Complaint>> GetComplaintsByTypeAsync(string type, int pageNumber, int pageSize)
    {
        return await _complaintRepository.GetByTypeAsync(type, pageNumber, pageSize);
    }

    public async Task<Complaint?> UpdateComplaintAsync(string id, string? status, string? resolution, string? assignedTo)
    {
        var complaint = await _complaintRepository.GetByIdAsync(id);
        if (complaint == null) return null;

        if (!string.IsNullOrEmpty(status)) complaint.Status = status;
        if (!string.IsNullOrEmpty(resolution)) complaint.Resolution = resolution;
        if (!string.IsNullOrEmpty(assignedTo)) complaint.AssignedTo = assignedTo;

        var updated = await _complaintRepository.UpdateAsync(id, complaint);
        return updated ? complaint : null;
    }

    public async Task<List<Complaint>> GetAllComplaintsAsync()
    {
        var complaints = await _complaintRepository.GetAllAsync();
        return complaints.ToList();
    }
}
