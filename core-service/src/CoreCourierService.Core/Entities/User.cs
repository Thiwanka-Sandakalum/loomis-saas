using MongoDB.Bson.Serialization.Attributes;

namespace CoreCourierService.Core.Entities;

[BsonCollection("users")]
public class User : TenantEntity
{
    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("password_hash")]
    public string PasswordHash { get; set; } = string.Empty;

    [BsonElement("first_name")]
    public string? FirstName { get; set; }

    [BsonElement("last_name")]
    public string? LastName { get; set; }

    [BsonElement("phone")]
    public string? Phone { get; set; }

    [BsonElement("role")]
    public string Role { get; set; } = "customer"; // admin, csr, customer
}
