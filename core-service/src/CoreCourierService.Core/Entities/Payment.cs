using MongoDB.Bson.Serialization.Attributes;

namespace CoreCourierService.Core.Entities;

[BsonCollection("payments")]
public class Payment : TenantEntity
{
    [BsonElement("tracking_number")]
    public string TrackingNumber { get; set; } = string.Empty;

    [BsonElement("amount")]
    public decimal Amount { get; set; }

    [BsonElement("method")]
    public string Method { get; set; } = string.Empty; // CreditCard, DebitCard, Cash, BankTransfer

    [BsonElement("status")]
    public string Status { get; set; } = "Pending"; // Pending, Completed, Failed, Refunded

    [BsonElement("transaction_id")]
    public string? TransactionId { get; set; }
}
