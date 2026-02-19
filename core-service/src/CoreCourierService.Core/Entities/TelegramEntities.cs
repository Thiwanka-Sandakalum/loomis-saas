using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CoreCourierService.Core.Entities;

public class TelegramChat
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("tenant_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string TenantId { get; set; } = string.Empty;

    [BsonElement("chat_id")]
    public string ChatId { get; set; } = string.Empty;

    [BsonElement("user_name")]
    public string? UserName { get; set; }

    [BsonElement("first_name")]
    public string? FirstName { get; set; }

    [BsonElement("last_name")]
    public string? LastName { get; set; }

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("last_message_at")]
    public DateTime? LastMessageAt { get; set; }

    [BsonElement("is_active")]
    public bool IsActive { get; set; } = true;
}

public class TelegramMessage
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    [BsonElement("tenant_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string TenantId { get; set; } = string.Empty;

    [BsonElement("chat_id")]
    public string ChatId { get; set; } = string.Empty;

    [BsonElement("message_id")]
    public long MessageId { get; set; }

    [BsonElement("from_user")]
    public string FromUser { get; set; } = string.Empty;

    [BsonElement("text")]
    public string Text { get; set; } = string.Empty;

    [BsonElement("direction")]
    public string Direction { get; set; } = string.Empty; // inbound, outbound

    [BsonElement("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [BsonElement("session_id")]
    public string? SessionId { get; set; }

    [BsonElement("metadata")]
    public BsonDocument? Metadata { get; set; }
}
