using CoreCourierService.Api.DTOs;
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
        ITenantService tenantService,
        ITenantUserService tenantUserService,
        ILogger<TenantResolverMiddleware> logger)
    {
        var auth0UserId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

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
                    await context.Response.WriteAsJsonAsync(ApiErrors.Create("FORBIDDEN", "Tenant not found or inactive"));
                    return;
                }

                tenantContext.SetTenant(tenantUser.TenantId);
                context.Items["TenantId"] = tenantUser.TenantId;
                context.Items["TenantPlan"] = tenant.Plan;
                context.Items["Auth0UserId"] = auth0UserId;
                context.Items["Role"] = tenantUser.Role;

                await _next(context);
                return;
            }
        }

        await _next(context);
    }
}