using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace CoreCourierService.Infrastructure.Repositories;

public class AuditLogRepository : IAuditLogRepository
{
    private readonly IMongoCollection<AuditLog> _auditLogs;

    public AuditLogRepository(IOptions<MongoDbSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        var database = client.GetDatabase(settings.Value.DatabaseName);
        _auditLogs = database.GetCollection<AuditLog>("audit_logs");

        CreateIndexes();
    }

    private void CreateIndexes()
    {
        // Index for tenant + timestamp
        var tenantTimestampIndex = Builders<AuditLog>.IndexKeys
            .Ascending(a => a.TenantId)
            .Descending(a => a.Timestamp);
        _auditLogs.Indexes.CreateOne(new CreateIndexModel<AuditLog>(tenantTimestampIndex));

        // Index for user actions
        var userIndex = Builders<AuditLog>.IndexKeys
            .Ascending(a => a.TenantId)
            .Ascending(a => a.UserId)
            .Descending(a => a.Timestamp);
        _auditLogs.Indexes.CreateOne(new CreateIndexModel<AuditLog>(userIndex));

        // Index for resource tracking
        var resourceIndex = Builders<AuditLog>.IndexKeys
            .Ascending(a => a.TenantId)
            .Ascending(a => a.ResourceType)
            .Ascending(a => a.ResourceId);
        _auditLogs.Indexes.CreateOne(new CreateIndexModel<AuditLog>(resourceIndex));

        // Index for correlation ID
        var correlationIndex = Builders<AuditLog>.IndexKeys
            .Ascending(a => a.CorrelationId);
        _auditLogs.Indexes.CreateOne(new CreateIndexModel<AuditLog>(correlationIndex));

        // TTL index for auto-deletion after 90 days
        var ttlIndex = Builders<AuditLog>.IndexKeys.Ascending(a => a.Timestamp);
        var ttlOptions = new CreateIndexOptions { ExpireAfter = TimeSpan.FromDays(90) };
        _auditLogs.Indexes.CreateOne(new CreateIndexModel<AuditLog>(ttlIndex, ttlOptions));
    }

    public async Task<AuditLog> CreateAsync(AuditLog auditLog)
    {
        await _auditLogs.InsertOneAsync(auditLog);
        return auditLog;
    }

    public async Task<List<AuditLog>> GetByTenantAsync(string tenantId, int skip = 0, int limit = 100)
    {
        return await _auditLogs.Find(a => a.TenantId == tenantId)
            .SortByDescending(a => a.Timestamp)
            .Skip(skip)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<List<AuditLog>> GetByUserAsync(string userId, string tenantId, int skip = 0, int limit = 100)
    {
        return await _auditLogs.Find(a => a.UserId == userId && a.TenantId == tenantId)
            .SortByDescending(a => a.Timestamp)
            .Skip(skip)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<List<AuditLog>> GetByResourceAsync(string resourceType, string resourceId, string tenantId, int skip = 0, int limit = 100)
    {
        return await _auditLogs.Find(a =>
            a.ResourceType == resourceType &&
            a.ResourceId == resourceId &&
            a.TenantId == tenantId)
            .SortByDescending(a => a.Timestamp)
            .Skip(skip)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<long> GetCountAsync(string tenantId)
    {
        return await _auditLogs.CountDocumentsAsync(a => a.TenantId == tenantId);
    }
}
