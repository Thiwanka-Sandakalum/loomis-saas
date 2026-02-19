using MongoDB.Bson.Serialization.Attributes;

namespace CoreCourierService.Core.Entities;

/// <summary>
/// Base class for all tenant-scoped entities
/// </summary>
public abstract class TenantEntity : BaseEntity
{
    [BsonElement("tenant_id")]
    public string TenantId { get; set; } = string.Empty;
}
