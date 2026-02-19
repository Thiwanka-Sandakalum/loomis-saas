using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;

namespace CoreCourierService.Api.Services;

public class RateService
{
    private readonly IRateRepository _rateRepository;
    private readonly ITenantContext _tenantContext;

    public RateService(IRateRepository rateRepository, ITenantContext tenantContext)
    {
        _rateRepository = rateRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Rate> CreateRateAsync(string serviceType, decimal baseRate, decimal additionalKgRate, decimal minWeight, decimal maxWeight)
    {
        var rate = new Rate
        {
            ServiceType = serviceType,
            BaseRate = baseRate,
            AdditionalKgRate = additionalKgRate,
            MinWeight = minWeight,
            MaxWeight = maxWeight
        };

        return await _rateRepository.CreateAsync(rate);
    }

    public async Task<Rate?> GetRateByIdAsync(string id)
    {
        return await _rateRepository.GetByIdAsync(id);
    }

    public async Task<List<Rate>> GetAllRatesAsync()
    {
        return await _rateRepository.GetAllRatesAsync();
    }

    public async Task<Rate?> UpdateRateAsync(string id, decimal? baseRate, decimal? additionalKgRate, decimal? minWeight, decimal? maxWeight)
    {
        var rate = await _rateRepository.GetByIdAsync(id);
        if (rate == null) return null;

        if (baseRate.HasValue) rate.BaseRate = baseRate.Value;
        if (additionalKgRate.HasValue) rate.AdditionalKgRate = additionalKgRate.Value;
        if (minWeight.HasValue) rate.MinWeight = minWeight.Value;
        if (maxWeight.HasValue) rate.MaxWeight = maxWeight.Value;

        var updated = await _rateRepository.UpdateAsync(id, rate);
        return updated ? rate : null;
    }

    public async Task<bool> DeleteRateAsync(string id)
    {
        return await _rateRepository.DeleteAsync(id);
    }

    public async Task<(decimal total, decimal baseRate, decimal additionalCharges, string estimatedDelivery)> CalculateRateAsync(string serviceType, decimal weight)
    {
        var rate = await _rateRepository.GetByServiceTypeAsync(serviceType);
        if (rate == null)
            throw new Exception($"No rate found for service type: {serviceType}");

        var baseRate = rate.BaseRate;
        var additionalCharges = weight > 1 ? (weight - 1) * rate.AdditionalKgRate : 0;
        var total = baseRate + additionalCharges;

        // Calculate estimated delivery based on service type
        var estimatedDelivery = serviceType switch
        {
            "Standard" => DateTime.UtcNow.AddDays(5).ToString("yyyy-MM-dd"),
            "Express" => DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd"),
            "Overnight" => DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-dd"),
            _ => DateTime.UtcNow.AddDays(5).ToString("yyyy-MM-dd")
        };

        return (total, baseRate, additionalCharges, estimatedDelivery);
    }
}
