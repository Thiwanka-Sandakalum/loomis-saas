using MongoDB.Bson.Serialization.Attributes;

namespace CoreCourierService.Core.Entities;

[BsonCollection("tenant_integrations")]
public class TenantIntegration : TenantEntity
{
    [BsonElement("integration_type")]
    public string IntegrationType { get; set; } = string.Empty; // "telegram", "whatsapp", "facebook"

    [BsonElement("config")]
    public IntegrationConfig? Config { get; set; }

    [BsonElement("is_active")]
    public bool IsActive { get; set; } = true;
}

public abstract class IntegrationConfig
{
    [BsonElement("type")]
    public string Type { get; set; } = string.Empty;
}

public class TelegramConfig : IntegrationConfig
{
    [BsonElement("bot_token")]
    public string BotToken { get; set; } = string.Empty;

    [BsonElement("bot_username")]
    public string BotUsername { get; set; } = string.Empty;

    [BsonElement("webhook_url")]
    public string WebhookUrl { get; set; } = string.Empty;

    [BsonElement("allowed_commands")]
    public List<string> AllowedCommands { get; set; } = new();

    [BsonElement("auto_reply_enabled")]
    public bool AutoReplyEnabled { get; set; } = false;

    [BsonElement("forward_to_brain")]
    public bool ForwardToBrain { get; set; } = true;

    [BsonElement("greeting_message")]
    public string? GreetingMessage { get; set; }

    public TelegramConfig()
    {
        Type = "telegram";
    }
}

public class WhatsAppConfig : IntegrationConfig
{
    [BsonElement("phone_number_id")]
    public string PhoneNumberId { get; set; } = string.Empty;

    [BsonElement("access_token")]
    public string AccessToken { get; set; } = string.Empty;

    [BsonElement("webhook_verify_token")]
    public string WebhookVerifyToken { get; set; } = string.Empty;

    [BsonElement("business_account_id")]
    public string BusinessAccountId { get; set; } = string.Empty;

    [BsonElement("auto_reply_enabled")]
    public bool AutoReplyEnabled { get; set; } = false;

    [BsonElement("forward_to_brain")]
    public bool ForwardToBrain { get; set; } = true;

    public WhatsAppConfig()
    {
        Type = "whatsapp";
    }
}
