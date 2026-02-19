using CoreCourierService.Core.Entities;

namespace CoreCourierService.Core.Interfaces;

public interface IComplaintRepository : IRepository<Complaint>
{
    Task<List<Complaint>> GetByTrackingNumberAsync(string trackingNumber);
    Task<List<Complaint>> GetByStatusAsync(string status, int pageNumber, int pageSize);
    Task<List<Complaint>> GetByTypeAsync(string type, int pageNumber, int pageSize);
}
