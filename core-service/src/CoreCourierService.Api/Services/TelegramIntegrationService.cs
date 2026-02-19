using CoreCourierService.Api.DTOs;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Json;

namespace CoreCourierService.Api.Services;

public class TelegramIntegrationService : ITelegramIntegrationService
{
    private readonly ITenantIntegrationRepository _repository;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<TelegramIntegrationService> _logger;
    private readonly HttpClient _httpClient;
    private readonly string _webhookBaseUrl;

    public TelegramIntegrationService(
        ITenantIntegrationRepository repository,
        ITenantContext tenantContext,
        ILogger<TelegramIntegrationService> logger,
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _repository = repository;
        _tenantContext = tenantContext;
        _logger = logger;
        _httpClient = httpClient;
        _webhookBaseUrl = configuration["Integrations:Telegram:WebhookBaseUrl"]
            ?? "https://api.courierservice.com";
    }

    public async Task<TenantIntegration> SetupTelegramBotAsync(object requestObj)
    {
        if (requestObj is not SetupTelegramRequest request)
        {
            throw new ArgumentException("Invalid request type", nameof(requestObj));
        }

        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");

        // Verify bot token with Telegram API
        var isValid = await TestConnectionAsync(request.BotToken);
        if (!isValid)
        {
            throw new InvalidOperationException("Invalid Telegram bot token. Please verify your token.");
        }

        var existing = await _repository.GetByTenantIdAndTypeAsync(tenantId, "telegram");

        var config = new TelegramConfig
        {
            BotToken = request.BotToken,
            BotUsername = request.BotUsername,
            WebhookUrl = GenerateWebhookUrl(tenantId),
            AllowedCommands = request.AllowedCommands ?? GetDefaultCommands(),
            AutoReplyEnabled = request.AutoReplyEnabled,
            ForwardToBrain = request.ForwardToBrain,
            GreetingMessage = request.GreetingMessage
        };

        TenantIntegration integration;

        if (existing != null)
        {
            // Update existing integration
            existing.Config = config;
            existing.IsActive = true;
            existing.UpdatedAt = DateTime.UtcNow;

            await SetupWebhookAsync(config);
            await _repository.UpdateAsync(existing.Id, existing);
            integration = existing;

            _logger.LogInformation(
                "Updated Telegram integration for tenant {TenantId}",
                tenantId);
        }
        else
        {
            // Create new integration
            integration = new TenantIntegration
            {
                TenantId = tenantId,
                IntegrationType = "telegram",
                Config = config,
                IsActive = true
            };

            await SetupWebhookAsync(config);
            integration = await _repository.CreateAsync(integration);

            _logger.LogInformation(
                "Created Telegram integration for tenant {TenantId} with bot @{BotUsername}",
                tenantId,
                config.BotUsername);
        }

        return integration;
    }

    public async Task<bool> DisconnectTelegramBotAsync()
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");

        var integration = await _repository.GetByTenantIdAndTypeAsync(tenantId, "telegram");

        if (integration?.Config is not TelegramConfig config)
        {
            return false;
        }

        // Remove webhook from Telegram
        await RemoveWebhookAsync(config.BotToken);

        // Delete integration
        var deleted = await _repository.DeleteAsync(integration.Id);

        if (deleted)
        {
            _logger.LogInformation(
                "Disconnected Telegram bot for tenant {TenantId}",
                tenantId);
        }

        return deleted;
    }

    public async Task<TenantIntegration?> GetIntegrationStatusAsync()
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");

        return await _repository.GetByTenantIdAndTypeAsync(tenantId, "telegram");
    }

    public async Task<bool> TestConnectionAsync(string botToken)
    {
        try
        {
            var response = await _httpClient.GetAsync(
                $"https://api.telegram.org/bot{botToken}/getMe");

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Telegram bot token verification failed with status {StatusCode}",
                    response.StatusCode);
                return false;
            }

            var result = await response.Content.ReadFromJsonAsync<TelegramApiResponse<TelegramBotInfo>>();
            return result?.Ok == true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying Telegram bot token");
            return false;
        }
    }

    public async Task<object?> GetWebhookInfoAsync()
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");

        var integration = await _repository.GetByTenantIdAndTypeAsync(tenantId, "telegram");

        if (integration?.Config is not TelegramConfig config)
        {
            return null;
        }

        try
        {
            var response = await _httpClient.GetAsync(
                $"https://api.telegram.org/bot{config.BotToken}/getWebhookInfo");

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var result = await response.Content.ReadFromJsonAsync<TelegramApiResponse<TelegramWebhookInfo>>();
            return result?.Result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting webhook info");
            return null;
        }
    }

    public async Task<bool> UpdateConfigAsync(object requestObj)
    {
        if (requestObj is not SetupTelegramRequest request)
        {
            throw new ArgumentException("Invalid request type", nameof(requestObj));
        }

        return await SetupTelegramBotAsync(requestObj) != null;
    }

    private async Task SetupWebhookAsync(TelegramConfig config)
    {
        var url = $"https://api.telegram.org/bot{config.BotToken}/setWebhook";

        var payload = new
        {
            url = config.WebhookUrl,
            allowed_updates = new[] { "message", "callback_query" },
            drop_pending_updates = false
        };

        var response = await _httpClient.PostAsJsonAsync(url, payload);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogError(
                "Failed to set Telegram webhook. Status: {StatusCode}, Response: {Response}",
                response.StatusCode,
                errorContent);
            throw new InvalidOperationException("Failed to register webhook with Telegram");
        }

        _logger.LogInformation(
            "Telegram webhook registered successfully at {WebhookUrl}",
            config.WebhookUrl);
    }

    private async Task RemoveWebhookAsync(string botToken)
    {
        try
        {
            await _httpClient.PostAsync(
                $"https://api.telegram.org/bot{botToken}/deleteWebhook",
                null);

            _logger.LogInformation("Telegram webhook removed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error removing Telegram webhook");
        }
    }

    private string GenerateWebhookUrl(string tenantId)
    {
        return $"{_webhookBaseUrl}/api/integrations/telegram/webhook/{tenantId}";
    }

    private List<string> GetDefaultCommands()
    {
        return new List<string>
        {
            "/start",
            "/help",
            "/track",
            "/rates",
            "/create",
            "/complaint"
        };
    }
}
