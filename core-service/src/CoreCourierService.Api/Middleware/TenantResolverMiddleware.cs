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

        var auth0UserId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        logger.LogInformation($"TenantResolverMiddleware: User Claims: {string.Join(", ", context.User.Claims.Select(c => $"{c.Type}:{c.Value}"))}");
        if (!string.IsNullOrWhiteSpace(auth0UserId))
        {
            var tenantUser = await tenantUserService.GetByAuth0UserIdAsync(auth0UserId);
            if (tenantUser != null)
            {
                var tenant = await tenantService.GetByIdAsync(tenantUser.TenantId);
                if (tenant == null)
                {
                    logger.LogWarning("Tenant {TenantId} not found for user {Auth0UserId}", tenantUser.TenantId, auth0UserId);
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    await context.Response.WriteAsJsonAsync(new { error = "Tenant not found or inactive" });
                    return;
                }

                tenantContext.SetTenant(tenantUser.TenantId);
                context.Items["TenantId"] = tenantUser.TenantId;
                context.Items["TenantPlan"] = tenant.Plan;

                await _next(context);
                return;
            }
        }

        await _next(context);
    }
}