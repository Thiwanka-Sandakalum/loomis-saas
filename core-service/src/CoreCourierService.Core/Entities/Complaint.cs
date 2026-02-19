using MongoDB.Bson.Serialization.Attributes;

namespace CoreCourierService.Core.Entities;

[BsonCollection("complaints")]
public class Complaint : TenantEntity
{
    [BsonElement("tracking_number")]
    public string TrackingNumber { get; set; } = string.Empty;

    [BsonElement("type")]
    public string Type { get; set; } = string.Empty; // Delay, Damage, Lost, Other

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("status")]
    public string Status { get; set; } = "Open"; // Open, InProgress, Resolved, Closed

    [BsonElement("resolution")]
    public string? Resolution { get; set; }

    [BsonElement("customer_email")]
    public string? CustomerEmail { get; set; }

    [BsonElement("customer_phone")]
    public string? CustomerPhone { get; set; }

    [BsonElement("assigned_to")]
    public string? AssignedTo { get; set; }
}
