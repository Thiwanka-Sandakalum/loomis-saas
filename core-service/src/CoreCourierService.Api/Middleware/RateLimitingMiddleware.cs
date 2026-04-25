using CoreCourierService.Api.DTOs;
using Microsoft.Extensions.Caching.Memory;

namespace CoreCourierService.Api.Middleware;

public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;
    private readonly ILogger<RateLimitingMiddleware> _logger;

    // Rate limit configuration (requests per minute)
    private readonly Dictionary<string, int> _planLimits = new()
    {
        { "free", 60 },       // 60 requests/minute
        { "pro", 300 },       // 300 requests/minute
        { "enterprise", 1000 } // 1000 requests/minute
    };

    public RateLimitingMiddleware(
        RequestDelegate next,
        IMemoryCache cache,
        ILogger<RateLimitingMiddleware> logger)
    {
        _next = next;
        _cache = cache;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip rate limiting for health checks and authentication endpoints
        if (context.Request.Path.StartsWithSegments("/health") ||
            context.Request.Path.StartsWithSegments("/api/auth"))
        {
            await _next(context);
            return;
        }

        // Get tenant ID from context (set by TenantResolverMiddleware)
        var tenantId = context.Items["TenantId"]?.ToString();
        if (string.IsNullOrEmpty(tenantId))
        {
            // No tenant context, skip rate limiting
            await _next(context);
            return;
        }

        // Get tenant plan (should be from database, hardcoded for now)
        var tenantPlan = context.Items["TenantPlan"]?.ToString() ?? "free";
        var limit = _planLimits.GetValueOrDefault(tenantPlan, 60);

        // Create cache key
        var cacheKey = $"ratelimit_{tenantId}_{DateTime.UtcNow:yyyyMMddHHmm}";

        // Get or create the counter object for this window (stored as a reference type for Interlocked)
        var counter = _cache.GetOrCreate(cacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            return new RateLimitCounter();
        })!;

        var requestCount = Interlocked.Increment(ref counter.Count);

        if (requestCount > limit)
        {
            _logger.LogWarning("Rate limit exceeded for tenant {TenantId}. Plan: {Plan}, Limit: {Limit}",
                tenantId, tenantPlan, limit);

            context.Response.StatusCode = 429; // Too Many Requests
            context.Response.ContentType = "application/json";

            await context.Response.WriteAsJsonAsync(ApiErrors.Create(
                "RATE_LIMIT_EXCEEDED",
                $"You have exceeded the rate limit of {limit} requests per minute for your {tenantPlan} plan",
                new { retryAfterSeconds = 60 }));
            return;
        }

        // Add rate limit headers
        context.Response.Headers["X-RateLimit-Limit"] = limit.ToString();
        context.Response.Headers["X-RateLimit-Remaining"] = Math.Max(0, limit - requestCount).ToString();
        context.Response.Headers["X-RateLimit-Reset"] = DateTimeOffset.UtcNow.AddMinutes(1).ToUnixTimeSeconds().ToString();

        await _next(context);
    }
}

/// <summary>
/// Reference-type wrapper for a rate limit counter so <see cref="System.Threading.Interlocked"/> can
/// atomically increment it while it lives inside the <see cref="IMemoryCache"/>.
/// </summary>
internal sealed class RateLimitCounter
{
    public int Count;
}
