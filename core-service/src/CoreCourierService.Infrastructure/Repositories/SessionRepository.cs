using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace CoreCourierService.Infrastructure.Repositories;

public class SessionRepository : ISessionRepository
{
    private readonly IMongoCollection<Session> _sessions;

    public SessionRepository(IOptions<MongoDbSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        var database = client.GetDatabase(settings.Value.DatabaseName);
        _sessions = database.GetCollection<Session>("sessions");

        // Create indexes
        CreateIndexes();
    }

    private void CreateIndexes()
    {
        // Compound index for tenant + session_id (most common query)
        var tenantSessionIndex = Builders<Session>.IndexKeys
            .Ascending(s => s.TenantId)
            .Ascending(s => s.SessionId);
        _sessions.Indexes.CreateOne(new CreateIndexModel<Session>(tenantSessionIndex));

        // Compound index for tenant + user_id
        var tenantUserIndex = Builders<Session>.IndexKeys
            .Ascending(s => s.TenantId)
            .Ascending(s => s.UserId);
        _sessions.Indexes.CreateOne(new CreateIndexModel<Session>(tenantUserIndex));

        // TTL index for auto-expiry
        var expiryIndex = Builders<Session>.IndexKeys.Ascending(s => s.ExpiresAt);
        var indexOptions = new CreateIndexOptions { ExpireAfter = TimeSpan.Zero };
        _sessions.Indexes.CreateOne(new CreateIndexModel<Session>(expiryIndex, indexOptions));

        // Index for active sessions
        var activeIndex = Builders<Session>.IndexKeys
            .Ascending(s => s.TenantId)
            .Ascending(s => s.IsActive);
        _sessions.Indexes.CreateOne(new CreateIndexModel<Session>(activeIndex));
    }

    public async Task<Session?> GetBySessionIdAsync(string sessionId, string tenantId)
    {
        return await _sessions.Find(s => s.SessionId == sessionId && s.TenantId == tenantId)
            .FirstOrDefaultAsync();
    }

    public async Task<Session?> GetByIdAsync(string id, string tenantId)
    {
        return await _sessions.Find(s => s.Id == id && s.TenantId == tenantId)
            .FirstOrDefaultAsync();
    }

    public async Task<List<Session>> GetUserSessionsAsync(string userId, string tenantId)
    {
        return await _sessions.Find(s => s.UserId == userId && s.TenantId == tenantId && s.IsActive)
            .SortByDescending(s => s.UpdatedAt)
            .ToListAsync();
    }

    public async Task<List<Session>> GetActiveSessionsAsync(string tenantId)
    {
        return await _sessions.Find(s => s.TenantId == tenantId && s.IsActive)
            .SortByDescending(s => s.UpdatedAt)
            .Limit(100)
            .ToListAsync();
    }

    public async Task<Session> CreateAsync(Session session)
    {
        await _sessions.InsertOneAsync(session);
        return session;
    }

    public async Task<Session?> UpdateAsync(string sessionId, Session session)
    {
        session.UpdatedAt = DateTime.UtcNow;

        var result = await _sessions.FindOneAndReplaceAsync(
            s => s.SessionId == sessionId && s.TenantId == session.TenantId,
            session,
            new FindOneAndReplaceOptions<Session> { ReturnDocument = ReturnDocument.After }
        );

        return result;
    }

    public async Task<bool> DeleteAsync(string sessionId, string tenantId)
    {
        var result = await _sessions.DeleteOneAsync(s => s.SessionId == sessionId && s.TenantId == tenantId);
        return result.DeletedCount > 0;
    }

    public async Task<bool> InvalidateUserSessionsAsync(string userId, string tenantId)
    {
        var update = Builders<Session>.Update.Set(s => s.IsActive, false);
        var result = await _sessions.UpdateManyAsync(
            s => s.UserId == userId && s.TenantId == tenantId,
            update
        );
        return result.ModifiedCount > 0;
    }

    public async Task<int> CleanupExpiredSessionsAsync(string tenantId)
    {
        var result = await _sessions.DeleteManyAsync(
            s => s.TenantId == tenantId && s.ExpiresAt < DateTime.UtcNow
        );
        return (int)result.DeletedCount;
    }
}
