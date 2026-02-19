using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace CoreCourierService.Api.Services;

public interface ICacheService
{
    T? Get<T>(string key);
    void Set<T>(string key, T value, TimeSpan? expiration = null);
    void Remove(string key);
    bool Exists(string key);
}

public class CacheService : ICacheService
{
    private readonly IMemoryCache _cache;
    private readonly TimeSpan _defaultExpiration = TimeSpan.FromMinutes(15);

    public CacheService(IMemoryCache cache)
    {
        _cache = cache;
    }

    public T? Get<T>(string key)
    {
        _cache.TryGetValue(key, out T? value);
        return value;
    }

    public void Set<T>(string key, T value, TimeSpan? expiration = null)
    {
        var cacheOptions = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = expiration ?? _defaultExpiration
        };

        _cache.Set(key, value, cacheOptions);
    }

    public void Remove(string key)
    {
        _cache.Remove(key);
    }

    public bool Exists(string key)
    {
        return _cache.TryGetValue(key, out _);
    }
}

// Cache key helpers
public static class CacheKeys
{
    public static string TenantConfig(string tenantId) => $"tenant_config_{tenantId}";
    public static string TenantRates(string tenantId) => $"tenant_rates_{tenantId}";
    public static string ShipmentTracking(string trackingNumber) => $"shipment_{trackingNumber}";
    public static string UserPermissions(string userId, string tenantId) => $"permissions_{tenantId}_{userId}";
}
