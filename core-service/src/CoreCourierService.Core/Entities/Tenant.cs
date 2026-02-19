using MongoDB.Bson.Serialization.Attributes;

namespace CoreCourierService.Core.Entities;

[BsonCollection("tenants")]
public class Tenant : BaseEntity
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("api_key")]
    public string ApiKey { get; set; } = string.Empty;

    [BsonElement("plan")]
    public string Plan { get; set; } = "free"; // free, pro, enterprise

    [BsonElement("branding")]
    public TenantBranding? Branding { get; set; }

    [BsonElement("company_profile")]
    public CompanyProfile? CompanyProfile { get; set; }

    [BsonElement("onboarding_status")]
    public OnboardingStatus Onboarding { get; set; } = new();

    [BsonElement("enabled_services")]
    public List<string> EnabledServices { get; set; } = new() { "Standard" };

    [BsonElement("is_active")]
    public bool IsActive { get; set; } = true;
}

public class TenantBranding
{
    [BsonElement("primary_color")]
    public string PrimaryColor { get; set; } = "#3B82F6";

    [BsonElement("tone")]
    public string Tone { get; set; } = "professional"; // friendly, professional, casual

    [BsonElement("logo_url")]
    public string? LogoUrl { get; set; }
}

public class CompanyProfile
{
    [BsonElement("organization_name")]
    public string OrganizationName { get; set; } = string.Empty;

    [BsonElement("corporate_website")]
    public string CorporateWebsite { get; set; } = string.Empty;

    [BsonElement("primary_language")]
    public string PrimaryLanguage { get; set; } = string.Empty;

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("support_email")]
    public string SupportEmail { get; set; } = string.Empty;

    [BsonElement("support_phone")]
    public string SupportPhone { get; set; } = string.Empty;

    [BsonElement("headquarters_address")]
    public string HeadquartersAddress { get; set; } = string.Empty;
}

public class OnboardingStatus
{
    [BsonElement("profile_completed")]
    public bool ProfileCompleted { get; set; }

    [BsonElement("rates_completed")]
    public bool RatesCompleted { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = "pending"; // pending, profile_completed, rate_completed, done
}

[AttributeUsage(AttributeTargets.Class)]
public class BsonCollectionAttribute : Attribute
{
    public string CollectionName { get; }

    public BsonCollectionAttribute(string collectionName)
    {
        CollectionName = collectionName;
    }
}
