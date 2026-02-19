using CoreCourierService.Core.Entities;

namespace CoreCourierService.Core.Interfaces;

public interface ITelegramIntegrationService
{
    Task<TenantIntegration> SetupTelegramBotAsync(object request);
    Task<bool> DisconnectTelegramBotAsync();
    Task<TenantIntegration?> GetIntegrationStatusAsync();
    Task<bool> TestConnectionAsync(string botToken);
    Task<object?> GetWebhookInfoAsync();
    Task<bool> UpdateConfigAsync(object request);
}

public interface ITelegramWebhookHandler
{
    Task HandleUpdateAsync(string tenantId, object update);
    Task HandleCommandAsync(TenantIntegration integration, object message);
    Task ForwardToBrainServiceAsync(TenantIntegration integration, object message);
    Task SendMessageAsync(string botToken, string chatId, string text, string? parseMode = "Markdown");
}
