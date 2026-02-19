using CoreCourierService.Core.Entities;

namespace CoreCourierService.Core.Interfaces;

public interface IPaymentRepository : IRepository<Payment>
{
    Task<List<Payment>> GetByTrackingNumberAsync(string trackingNumber);
    Task<List<Payment>> GetByStatusAsync(string status, int pageNumber, int pageSize);
}
