using MongoDB.Bson.Serialization.Attributes;

namespace CoreCourierService.Core.Entities;

[BsonCollection("shipment_events")]
public class ShipmentEvent : TenantEntity
{
    [BsonElement("tracking_number")]
    public string TrackingNumber { get; set; } = string.Empty;

    [BsonElement("status")]
    public string Status { get; set; } = string.Empty;

    [BsonElement("location")]
    public string Location { get; set; } = string.Empty;

    [BsonElement("notes")]
    public string? Notes { get; set; }

    [BsonElement("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
