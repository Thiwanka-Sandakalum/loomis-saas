using CoreCourierService.Core;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Api.Middleware;

namespace CoreCourierService.Api.Services;

public class RateService : IRateService
{
    private readonly IRateRepository _rateRepository;
    private readonly ITenantContext _tenantContext;
    private readonly ICacheService _cache;

    public RateService(IRateRepository rateRepository, ITenantContext tenantContext, ICacheService cache)
    {
        _rateRepository = rateRepository;
        _tenantContext = tenantContext;
        _cache = cache;
    }

    public async Task<Rate> CreateRateAsync(string serviceType, decimal baseRate, decimal additionalKgRate, decimal minWeight, decimal maxWeight)
    {
        var canonicalServiceType = ServiceConstants.ServiceTypes.Canonicalize(serviceType);
        var rate = new Rate
        {
            ServiceType = canonicalServiceType,
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
        if (updated)
        {
            _cache.Remove(CacheKeys.TenantRates($"{_tenantContext.TenantId}_{rate.ServiceType}"));
        }
        return updated ? rate : null;
    }

    public async Task<bool> DeleteRateAsync(string id)
    {
        return await _rateRepository.DeleteAsync(id);
    }

    public async Task<(decimal total, decimal baseRate, decimal additionalCharges, string estimatedDelivery)> CalculateRateAsync(string serviceType, decimal weight)
    {
        var canonicalServiceType = ServiceConstants.ServiceTypes.Canonicalize(serviceType);
        var cacheKey = CacheKeys.TenantRates($"{_tenantContext.TenantId}_{canonicalServiceType}");
        var rate = _cache.Get<Rate>(cacheKey);
        if (rate == null)
        {
            rate = await _rateRepository.GetByServiceTypeAsync(canonicalServiceType);
            if (rate != null)
            {
                _cache.Set(cacheKey, rate, TimeSpan.FromMinutes(30));
            }
        }
        if (rate == null)
            throw new NotFoundException($"No rate configured for service type: {serviceType}");

        var baseRate = rate.BaseRate;
        var additionalCharges = weight > 1 ? (weight - 1) * rate.AdditionalKgRate : 0;
        var total = baseRate + additionalCharges;

        // Calculate estimated delivery based on service type
        var estimatedDelivery = DateTime.UtcNow.AddDays(ServiceConstants.DeliveryDays.GetDays(canonicalServiceType)).ToString("yyyy-MM-dd");

        return (total, baseRate, additionalCharges, estimatedDelivery);
    }
}
