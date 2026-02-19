namespace CoreCourierService.Api.DTOs;

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
    long UpdateId,
    TelegramMessage? Message = null,
    TelegramCallbackQuery? CallbackQuery = null);

public record TelegramMessage(
    long MessageId,
    TelegramUser From,
    TelegramChat Chat,
    string Text,
    long Date);

public record TelegramUser(
    long Id,
    bool IsBot,
    string FirstName,
    string? LastName = null,
    string? Username = null,
    string? LanguageCode = null);

public record TelegramChat(
    long Id,
    string Type,
    string? Title = null,
    string? Username = null,
    string? FirstName = null,
    string? LastName = null);

public record TelegramCallbackQuery(
    string Id,
    TelegramUser From,
    TelegramMessage? Message,
    string Data);

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

public record BrainServiceRequest(
    string TenantId,
    string Platform,
    string UserId,
    string Message,
    BrainServiceMetadata Metadata);

public record BrainServiceMetadata(
    long ChatId,
    string? Username,
    string? FirstName);

public record BrainServiceResponse(
    bool Success,
    string Message,
    string? TrackingNumber = null,
    Dictionary<string, object>? Data = null);
