using CoreCourierService.Core.Entities;

namespace CoreCourierService.Core.Interfaces;

public interface IRateRepository : IRepository<Rate>
{
    Task<Rate?> GetByServiceTypeAsync(string serviceType);
    Task<List<Rate>> GetAllRatesAsync();
}
