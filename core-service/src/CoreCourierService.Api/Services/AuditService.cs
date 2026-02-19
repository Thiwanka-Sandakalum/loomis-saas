using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using Microsoft.AspNetCore.Http;
using MongoDB.Bson;

namespace CoreCourierService.Api.Services;

public class AuditService
{
    private readonly IAuditLogRepository _repository;
    private readonly ITenantContext _tenantContext;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditService(
        IAuditLogRepository repository,
        ITenantContext tenantContext,
        IHttpContextAccessor httpContextAccessor)
    {
        _repository = repository;
        _tenantContext = tenantContext;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task LogActionAsync(
        string action,
        string resourceType,
        string resourceId,
        string? userId = null,
        BsonDocument? changes = null,
        BsonDocument? metadata = null)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        var auditLog = new AuditLog
        {
            TenantId = tenantId,
            UserId = userId ?? httpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "system",
            Action = action,
            ResourceType = resourceType,
            ResourceId = resourceId,
            Changes = changes,
            Metadata = metadata,
            IpAddress = httpContext?.Connection.RemoteIpAddress?.ToString(),
            UserAgent = httpContext?.Request.Headers["User-Agent"].ToString(),
            CorrelationId = httpContext?.TraceIdentifier
        };
        await _repository.CreateAsync(auditLog);
    }

    public async Task<List<AuditLog>> GetTenantLogsAsync(int skip = 0, int limit = 100)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _repository.GetByTenantAsync(tenantId, skip, limit);
    }

    public async Task<List<AuditLog>> GetUserLogsAsync(string userId, int skip = 0, int limit = 100)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _repository.GetByUserAsync(userId, tenantId, skip, limit);
    }

    public async Task<List<AuditLog>> GetResourceLogsAsync(string resourceType, string resourceId, int skip = 0, int limit = 100)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _repository.GetByResourceAsync(resourceType, resourceId, tenantId, skip, limit);
    }

    public async Task<long> GetLogCountAsync()
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _repository.GetCountAsync(tenantId);
    }
}
