using CoreCourierService.Core.Entities;

namespace CoreCourierService.Core.Interfaces;

public interface ISessionRepository
{
    Task<Session?> GetBySessionIdAsync(string sessionId, string tenantId);
    Task<Session?> GetByIdAsync(string id, string tenantId);
    Task<List<Session>> GetUserSessionsAsync(string userId, string tenantId);
    Task<List<Session>> GetActiveSessionsAsync(string tenantId);
    Task<Session> CreateAsync(Session session);
    Task<Session?> UpdateAsync(string sessionId, Session session);
    Task<bool> DeleteAsync(string sessionId, string tenantId);
    Task<bool> InvalidateUserSessionsAsync(string userId, string tenantId);
    Task<int> CleanupExpiredSessionsAsync(string tenantId);
}
