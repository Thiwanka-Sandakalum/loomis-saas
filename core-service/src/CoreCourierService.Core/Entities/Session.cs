using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CoreCourierService.Core.Entities;

public class Session
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("tenant_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string TenantId { get; set; } = string.Empty;

    [BsonElement("session_id")]
    public string SessionId { get; set; } = Guid.NewGuid().ToString();

    [BsonElement("user_id")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("channel")]
    public string Channel { get; set; } = string.Empty; // web, telegram, whatsapp, api

    [BsonElement("data")]
    public BsonDocument Data { get; set; } = new();

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("expires_at")]
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(24);

    [BsonElement("is_active")]
    public bool IsActive { get; set; } = true;
}
