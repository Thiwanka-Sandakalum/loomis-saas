using System.Text.Json.Serialization;

namespace CoreCourierService.Api.DTOs;

public class AdkRunRequest
{
    [JsonPropertyName("appName")]
    public string AppName { get; set; } = string.Empty;

    [JsonPropertyName("userId")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("sessionId")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("newMessage")]
    public AdkNewMessage NewMessage { get; set; } = new();
}

public class AdkNewMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = "user";

    [JsonPropertyName("parts")]
    public List<AdkMessagePart> Parts { get; set; } = new();
}

public class AdkMessagePart
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;

    [JsonPropertyName("functionCall")]
    public AdkFunctionCall? FunctionCall { get; set; }

    [JsonPropertyName("functionResponse")]
    public AdkFunctionResponse? FunctionResponse { get; set; }
}

public class AdkFunctionCall
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("args")]
    public Dictionary<string, object>? Args { get; set; }

    [JsonPropertyName("id")]
    public string? Id { get; set; }
}

public class AdkFunctionResponse
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("response")]
    public object? Response { get; set; }
}

public class AdkEvent
{
    [JsonPropertyName("content")]
    public AdkEventContent? Content { get; set; }

    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }
}

public class AdkEventContent
{
    [JsonPropertyName("parts")]
    public List<AdkMessagePart>? Parts { get; set; }
}



// ==================== SETUP & CONFIGURATION ====================

public record SetupTelegramRequest(
    string BotToken,
    string BotUsername,
    List<string>? AllowedCommands = null,
    bool AutoReplyEnabled = false,
    bool ForwardToBrain = true,
    string? GreetingMessage = null);

public record TelegramIntegrationResponse(
    string Id,
    string IntegrationType,
    bool IsActive,
    TelegramConfigDto Config,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record TelegramConfigDto(
    string BotUsername,
    string WebhookUrl,
    List<string> AllowedCommands,
    bool AutoReplyEnabled,
    bool ForwardToBrain,
    string? GreetingMessage);

public record TelegramStatusResponse(
    bool IsConnected,
    string? BotUsername,
    bool AutoReplyEnabled,
    bool ForwardToBrain);

// ==================== TELEGRAM WEBHOOK MODELS ====================


public record TelegramUpdate(
    [property: JsonPropertyName("update_id")] long UpdateId,
    [property: JsonPropertyName("message")] TelegramMessage? Message = null,
    [property: JsonPropertyName("callback_query")] TelegramCallbackQuery? CallbackQuery = null);


public record TelegramMessage(
    [property: JsonPropertyName("message_id")] long MessageId,
    [property: JsonPropertyName("from")] TelegramUser From,
    [property: JsonPropertyName("chat")] TelegramChat Chat,
    [property: JsonPropertyName("text")] string Text,
    [property: JsonPropertyName("date")] long Date);


public record TelegramUser(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("is_bot")] bool IsBot,
    [property: JsonPropertyName("first_name")] string FirstName,
    [property: JsonPropertyName("last_name")] string? LastName = null,
    [property: JsonPropertyName("username")] string? Username = null,
    [property: JsonPropertyName("language_code")] string? LanguageCode = null);


public record TelegramChat(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("title")] string? Title = null,
    [property: JsonPropertyName("username")] string? Username = null,
    [property: JsonPropertyName("first_name")] string? FirstName = null,
    [property: JsonPropertyName("last_name")] string? LastName = null);


public record TelegramCallbackQuery(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("from")] TelegramUser From,
    [property: JsonPropertyName("message")] TelegramMessage? Message,
    [property: JsonPropertyName("data")] string Data);

// ==================== TELEGRAM API RESPONSES ====================

public record TelegramApiResponse<T>(
    bool Ok,
    T? Result = default,
    string? Description = null);

public record TelegramBotInfo(
    long Id,
    bool IsBot,
    string FirstName,
    string Username);

public record TelegramWebhookInfo(
    string Url,
    bool HasCustomCertificate,
    int PendingUpdateCount,
    string? LastErrorMessage = null,
    long? LastErrorDate = null);

// ==================== OUTBOUND MESSAGE ====================
// NOTE: SendTelegramMessageRequest moved to TelegramDtos.cs

public record TelegramReplyMarkup(
    List<List<TelegramInlineKeyboardButton>>? InlineKeyboard = null);

public record TelegramInlineKeyboardButton(
    string Text,
    string? Url = null,
    string? CallbackData = null);

// ==================== BRAIN SERVICE INTEGRATION ====================
