using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CoreCourierService.Core.Entities;

public class AuditLog
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("tenant_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string TenantId { get; set; } = string.Empty;

    [BsonElement("user_id")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("action")]
    public string Action { get; set; } = string.Empty;

    [BsonElement("resource_type")]
    public string ResourceType { get; set; } = string.Empty;

    [BsonElement("resource_id")]
    public string ResourceId { get; set; } = string.Empty;

    [BsonElement("changes")]
    public BsonDocument? Changes { get; set; }

    [BsonElement("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [BsonElement("ip_address")]
    public string? IpAddress { get; set; }

    [BsonElement("user_agent")]
    public string? UserAgent { get; set; }

    [BsonElement("correlation_id")]
    public string? CorrelationId { get; set; }

    [BsonElement("metadata")]
    public BsonDocument? Metadata { get; set; }
}
