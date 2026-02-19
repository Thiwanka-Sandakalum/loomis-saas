using CoreCourierService.Core.Entities;

namespace CoreCourierService.Core.Interfaces;

public interface IAuditLogRepository
{
    Task<AuditLog> CreateAsync(AuditLog auditLog);
    Task<List<AuditLog>> GetByTenantAsync(string tenantId, int skip = 0, int limit = 100);
    Task<List<AuditLog>> GetByUserAsync(string userId, string tenantId, int skip = 0, int limit = 100);
    Task<List<AuditLog>> GetByResourceAsync(string resourceType, string resourceId, string tenantId, int skip = 0, int limit = 100);
    Task<long> GetCountAsync(string tenantId);
}
