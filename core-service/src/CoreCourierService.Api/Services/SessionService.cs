using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using MongoDB.Bson;

namespace CoreCourierService.Api.Services;

public class SessionService
{
    private readonly ISessionRepository _sessionRepository;
    private readonly ITenantContext _tenantContext;

    public SessionService(ISessionRepository sessionRepository, ITenantContext tenantContext)
    {
        _sessionRepository = sessionRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Session> CreateSessionAsync(string userId, string channel, int expiryHours = 24)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        var session = new Session
        {
            TenantId = tenantId,
            UserId = userId,
            Channel = channel,
            SessionId = Guid.NewGuid().ToString(),
            ExpiresAt = DateTime.UtcNow.AddHours(expiryHours),
            IsActive = true
        };
        return await _sessionRepository.CreateAsync(session);
    }

    public async Task<Session?> GetSessionAsync(string sessionId)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _sessionRepository.GetBySessionIdAsync(sessionId, tenantId);
    }

    public async Task<List<Session>> GetUserSessionsAsync(string userId)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _sessionRepository.GetUserSessionsAsync(userId, tenantId);
    }

    public async Task<List<Session>> GetActiveSessionsAsync()
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _sessionRepository.GetActiveSessionsAsync(tenantId);
    }

    public async Task<Session?> UpdateSessionDataAsync(string sessionId, BsonDocument data)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        var session = await _sessionRepository.GetBySessionIdAsync(sessionId, tenantId);
        if (session == null)
        {
            return null;
        }

        session.Data = data;
        session.UpdatedAt = DateTime.UtcNow;

        return await _sessionRepository.UpdateAsync(sessionId, session);
    }

    public async Task<Session?> ExtendSessionAsync(string sessionId, int additionalHours = 24)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        var session = await _sessionRepository.GetBySessionIdAsync(sessionId, tenantId);
        if (session == null)
        {
            return null;
        }

        session.ExpiresAt = DateTime.UtcNow.AddHours(additionalHours);
        session.UpdatedAt = DateTime.UtcNow;

        return await _sessionRepository.UpdateAsync(sessionId, session);
    }

    public async Task<bool> InvalidateSessionAsync(string sessionId)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _sessionRepository.DeleteAsync(sessionId, tenantId);
    }

    public async Task<bool> InvalidateUserSessionsAsync(string userId)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _sessionRepository.InvalidateUserSessionsAsync(userId, tenantId);
    }

    public async Task<int> CleanupExpiredSessionsAsync()
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _sessionRepository.CleanupExpiredSessionsAsync(tenantId);
    }
}
