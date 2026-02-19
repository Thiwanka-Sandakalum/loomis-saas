using MongoDB.Bson.Serialization.Attributes;

namespace CoreCourierService.Core.Entities;

[BsonCollection("rates")]
public class Rate : TenantEntity
{
    [BsonElement("service_type")]
    public string ServiceType { get; set; } = "Standard"; // Standard, Express, Overnight

    [BsonElement("base_rate")]
    public decimal BaseRate { get; set; } // Base rate for first kg

    [BsonElement("additional_kg_rate")]
    public decimal AdditionalKgRate { get; set; } // Rate per additional kg

    [BsonElement("min_weight")]
    public decimal MinWeight { get; set; } = 0.5m;

    [BsonElement("max_weight")]
    public decimal MaxWeight { get; set; } = 30m;
}
