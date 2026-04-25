using CoreCourierService.Core.Entities;

namespace CoreCourierService.Core.Interfaces;

public interface ITelegramIntegrationService
{
    Task<TenantIntegration> SetupTelegramBotAsync(SetupTelegramRequest request);
    Task<bool> DisconnectTelegramBotAsync();
    Task<TenantIntegration?> GetIntegrationStatusAsync();
    Task<bool> TestConnectionAsync(string botToken);
    Task<object?> GetWebhookInfoAsync();
    Task<bool> UpdateConfigAsync(SetupTelegramRequest request);
}

public interface ITelegramWebhookHandler
{
    Task HandleUpdateAsync(string tenantId, object update);
    Task HandleCommandAsync(TenantIntegration integration, object message, string tenantId);
    Task ForwardToBrainServiceAsync(TenantIntegration integration, object message, string tenantId);
    Task SendMessageAsync(string botToken, string chatId, string text, string tenantId, string? parseMode = "Markdown");
}
