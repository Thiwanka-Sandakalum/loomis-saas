using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CoreCourierService.Core.Entities;

/// <summary>
/// Maps Auth0 user identities to SaaS tenants with roles
/// Auth0 owns authentication, this handles authorization + multi-tenancy
/// </summary>
public class TenantUser : BaseEntity
{
    /// <summary>
    /// Auth0 User ID from JWT token (ClaimTypes.NameIdentifier, mapped from 'sub' claim by JwtBearer)
    /// Format: auth0|xxx, google-oauth2|xxx, etc.
    /// </summary>
    [BsonElement("auth0_user_id")]
    public string Auth0UserId { get; set; } = string.Empty;

    /// <summary>
    /// SaaS tenant this user belongs to
    /// </summary>
    [BsonElement("tenant_id")]
    public string TenantId { get; set; } = string.Empty;

    /// <summary>
    /// User's role within the tenant
    /// </summary>
    [BsonElement("role")]
    public string Role { get; set; } = "customer"; // admin, csr, customer

    /// <summary>
    /// User status in this tenant
    /// </summary>
    [BsonElement("status")]
    public string Status { get; set; } = "active"; // active, invited, suspended

    /// <summary>
    /// Cached email from Clerk (for display purposes)
    /// </summary>
    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Cached name from Clerk (for display purposes)
    /// </summary>
    [BsonElement("name")]
    public string? Name { get; set; }

    /// <summary>
    /// When the user was invited to this tenant
    /// </summary>
    [BsonElement("invited_at")]
    public DateTime? InvitedAt { get; set; }

    /// <summary>
    /// User who invited this person (Auth0UserId)
    /// </summary>
    [BsonElement("invited_by")]
    public string? InvitedBy { get; set; }
}
