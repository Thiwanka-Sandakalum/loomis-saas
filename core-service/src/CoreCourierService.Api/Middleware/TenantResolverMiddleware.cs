using CoreCourierService.Api.Services;
using CoreCourierService.Core.Interfaces;

namespace CoreCourierService.Api.Middleware;

public class TenantResolverMiddleware
{
    private readonly RequestDelegate _next;

    public TenantResolverMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context,
        ITenantContext tenantContext,
        TenantService tenantService,
        TenantUserService tenantUserService,
        ILogger<TenantResolverMiddleware> logger)
    {
        var path = context.Request.Path.Value ?? string.Empty;
        var isOnboarding = path.StartsWith("/api/onboarding", StringComparison.OrdinalIgnoreCase);
        var isPublicTracking = path.StartsWith("/api/shipments/tracking", StringComparison.OrdinalIgnoreCase);
        var isHealth = path.StartsWith("/api/health", StringComparison.OrdinalIgnoreCase)
                       || path.StartsWith("/health", StringComparison.OrdinalIgnoreCase)
                       || path.StartsWith("/api/version", StringComparison.OrdinalIgnoreCase);
        var isTelegramWebhook = path.StartsWith("/api/integrations/telegram/webhook", StringComparison.OrdinalIgnoreCase);


        var auth0UserId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        logger.LogInformation($"TenantResolverMiddleware: User Claims: {string.Join(", ", context.User.Claims.Select(c => $"{c.Type}:{c.Value}"))}");
        if (!string.IsNullOrWhiteSpace(auth0UserId))
        {
            var tenantUser = await tenantUserService.GetByAuth0UserIdAsync(auth0UserId);
            if (tenantUser != null)
            {
                tenantContext.SetTenant(tenantUser.TenantId);
                context.Items["TenantId"] = tenantUser.TenantId;

                var tenant = await tenantService.GetByIdAsync(tenantUser.TenantId);
                if (tenant != null)
                {
                    context.Items["TenantPlan"] = tenant.Plan;
                }

                await _next(context);
                return;
            }
        }

        if (!isOnboarding && !isPublicTracking && !isHealth && !isTelegramWebhook)
        {
            logger.LogWarning("Tenant context not found for authenticated user");
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new
            {
                error = new
                {
                    code = "TENANT_NOT_FOUND",
                    message = "Tenant context not available"
                }
            });
            return;
        }

        await _next(context);
    }
}