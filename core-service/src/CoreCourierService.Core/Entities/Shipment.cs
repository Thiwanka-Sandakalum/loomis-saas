using MongoDB.Bson.Serialization.Attributes;

namespace CoreCourierService.Core.Entities;

[BsonCollection("shipments")]
public class Shipment : TenantEntity
{
    [BsonElement("tracking_number")]
    public string TrackingNumber { get; set; } = string.Empty;

    [BsonElement("sender")]
    public ContactInfo Sender { get; set; } = new();

    [BsonElement("receiver")]
    public ContactInfo Receiver { get; set; } = new();

    [BsonElement("parcel")]
    public ParcelInfo Parcel { get; set; } = new();

    [BsonElement("service_type")]
    public string ServiceType { get; set; } = "Standard"; // Standard, Express, Overnight

    [BsonElement("status")]
    public string Status { get; set; } = "Created"; // Created, PickedUp, InTransit, OutForDelivery, Delivered, Cancelled

    [BsonElement("special_instructions")]
    public string? SpecialInstructions { get; set; }

    [BsonElement("estimated_delivery")]
    public DateTime? EstimatedDelivery { get; set; }
}

public class ContactInfo
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("address")]
    public string Address { get; set; } = string.Empty;

    [BsonElement("city")]
    public string? City { get; set; }

    [BsonElement("country")]
    public string Country { get; set; } = string.Empty;

    [BsonElement("phone")]
    public string Phone { get; set; } = string.Empty;

    [BsonElement("email")]
    public string? Email { get; set; }
}

public class ParcelInfo
{
    [BsonElement("weight")]
    public decimal Weight { get; set; } // in kg

    [BsonElement("length")]
    public decimal? Length { get; set; } // in cm

    [BsonElement("width")]
    public decimal? Width { get; set; } // in cm

    [BsonElement("height")]
    public decimal? Height { get; set; } // in cm

    [BsonElement("description")]
    public string? Description { get; set; }

    [BsonElement("value")]
    public decimal? Value { get; set; } // declared value in USD
}
