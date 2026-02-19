using CoreCourierService.Api.DTOs;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using TelegramMessageDto = CoreCourierService.Api.DTOs.TelegramMessage;
using TelegramMessageEntity = CoreCourierService.Core.Entities.TelegramMessage;

namespace CoreCourierService.Api.Services;

public class TelegramWebhookHandler : ITelegramWebhookHandler
{
    private readonly ITenantIntegrationRepository _repository;
    private readonly IShipmentRepository _shipmentRepository;
    private readonly IRateRepository _rateRepository;
    private readonly ILogger<TelegramWebhookHandler> _logger;
    private readonly HttpClient _httpClient;
    private readonly string? _brainServiceUrl;

    public TelegramWebhookHandler(
        ITenantIntegrationRepository repository,
        IShipmentRepository shipmentRepository,
        IRateRepository rateRepository,
        ILogger<TelegramWebhookHandler> logger,
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _repository = repository;
        _shipmentRepository = shipmentRepository;
        _rateRepository = rateRepository;
        _logger = logger;
        _httpClient = httpClient;
        _brainServiceUrl = configuration["Integrations:BrainService:Url"];
    }

    public async Task HandleUpdateAsync(string tenantId, object updateObj)
    {
        if (updateObj is not TelegramUpdate update)
        {
            _logger.LogWarning("Invalid update object type");
            return;
        }

        var integration = await _repository.GetByTenantIdAndTypeAsync(tenantId, "telegram");

        if (integration == null || !integration.IsActive)
        {
            _logger.LogWarning(
                "Received webhook for inactive or non-existent tenant integration: {TenantId}",
                tenantId);
            return;
        }

        if (integration.Config is not TelegramConfig config)
        {
            _logger.LogError("Invalid config type for Telegram integration");
            return;
        }

        var message = update.Message;
        if (message == null)
        {
            _logger.LogDebug("Received update without message, skipping");
            return;
        }

        _logger.LogInformation(
            "Processing Telegram message from user {UserId} for tenant {TenantId}",
            message.From.Id,
            tenantId);

        // Check if it's a command
        if (message.Text.StartsWith("/"))
        {
            await HandleCommandAsync(integration, message);
        }
        else if (config.ForwardToBrain && !string.IsNullOrEmpty(_brainServiceUrl))
        {
            // Forward natural language messages to AI Brain
            await ForwardToBrainServiceAsync(integration, message);
        }
        else if (config.AutoReplyEnabled)
        {
            // Send auto-reply
            await SendMessageAsync(
                config.BotToken,
                message.Chat.Id.ToString(),
                "Thank you for your message. Our team will get back to you shortly.");
        }
    }

    public async Task HandleCommandAsync(TenantIntegration integration, object messageObj)
    {
        if (messageObj is not TelegramMessageDto message)
        {
            _logger.LogWarning("Invalid message object type");
            return;
        }

        if (integration.Config is not TelegramConfig config)
        {
            return;
        }

        var parts = message.Text.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var command = parts[0].ToLower();
        var args = parts.Skip(1).ToArray();

        // Check if command is allowed
        if (!config.AllowedCommands.Contains(command))
        {
            await SendMessageAsync(
                config.BotToken,
                message.Chat.Id.ToString(),
                $"Sorry, the command `{command}` is not available.");
            return;
        }

        string response = command switch
        {
            "/start" => await HandleStartCommand(config),
            "/help" => GetHelpMessage(config.AllowedCommands),
            "/track" => await HandleTrackCommandAsync(integration.TenantId, args),
            "/rates" => await HandleRatesCommandAsync(integration.TenantId),
            "/create" => GetCreateShipmentInstructions(),
            "/complaint" => GetComplaintInstructions(),
            _ => "Unknown command. Send /help for available commands."
        };

        await SendMessageAsync(config.BotToken, message.Chat.Id.ToString(), response);
    }

    public async Task ForwardToBrainServiceAsync(TenantIntegration integration, object messageObj)
    {
        if (messageObj is not TelegramMessageDto message)
        {
            _logger.LogWarning("Invalid message object type");
            return;
        }

        if (string.IsNullOrEmpty(_brainServiceUrl))
        {
            _logger.LogWarning("Brain service URL not configured");
            return;
        }

        if (integration.Config is not TelegramConfig config)
        {
            return;
        }

        try
        {
            var payload = new BrainServiceRequest(
                TenantId: integration.TenantId,
                Platform: "telegram",
                UserId: message.From.Id.ToString(),
                Message: message.Text,
                Metadata: new BrainServiceMetadata(
                    ChatId: message.Chat.Id,
                    Username: message.From.Username,
                    FirstName: message.From.FirstName
                )
            );

            _logger.LogInformation(
                "Forwarding message to Brain service for tenant {TenantId}",
                integration.TenantId);

            var response = await _httpClient.PostAsJsonAsync(
                $"{_brainServiceUrl}/api/chat/process",
                payload);

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<BrainServiceResponse>();

                if (result != null)
                {
                    await SendMessageAsync(config.BotToken, message.Chat.Id.ToString(), result.Message);

                    _logger.LogInformation(
                        "Successfully processed message via Brain service for tenant {TenantId}",
                        integration.TenantId);
                }
            }
            else
            {
                _logger.LogError(
                    "Brain service returned error status {StatusCode}",
                    response.StatusCode);

                await SendMessageAsync(
                    config.BotToken,
                    message.Chat.Id.ToString(),
                    "I'm having trouble processing your request right now. Please try again later or use /help for available commands.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error forwarding message to Brain service");

            await SendMessageAsync(
                config.BotToken,
                message.Chat.Id.ToString(),
                "Sorry, I encountered an error processing your request. Please try again or contact support.");
        }
    }

    public async Task SendMessageAsync(string botToken, string chatId, string text, string? parseMode = "Markdown")
    {
        try
        {
            var url = $"https://api.telegram.org/bot{botToken}/sendMessage";

            var payload = new SendTelegramMessageRequest(
                ChatId: chatId,
                Text: text
            );

            var response = await _httpClient.PostAsJsonAsync(url, payload);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError(
                    "Failed to send Telegram message. Status: {StatusCode}, Response: {Response}",
                    response.StatusCode,
                    errorContent);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending Telegram message to chat {ChatId}", chatId);
        }
    }

    // ==================== COMMAND HANDLERS ====================

    private async Task<string> HandleStartCommand(TelegramConfig config)
    {
        if (!string.IsNullOrEmpty(config.GreetingMessage))
        {
            return config.GreetingMessage;
        }

        return "👋 Welcome to our courier service!\n\n" +
               "I can help you track shipments, get rate quotes, and file complaints.\n\n" +
               "Send /help to see available commands.";
    }

    private string GetHelpMessage(List<string> allowedCommands)
    {
        var help = "🤖 *Available Commands*\n\n";

        if (allowedCommands.Contains("/track"))
            help += "📦 /track <tracking-number> - Track your shipment\n";

        if (allowedCommands.Contains("/rates"))
            help += "💰 /rates - View shipping rates\n";

        if (allowedCommands.Contains("/create"))
            help += "➕ /create - Instructions for creating shipment\n";

        if (allowedCommands.Contains("/complaint"))
            help += "📝 /complaint - File a complaint\n";

        help += "\n💬 You can also send me a message in plain language and I'll help you!";

        return help;
    }

    private async Task<string> HandleTrackCommandAsync(string tenantId, string[] args)
    {
        if (args.Length == 0)
        {
            return "Please provide a tracking number.\n\nUsage: /track LMS-ABC123";
        }

        var trackingNumber = args[0].Trim().ToUpper();

        // Validate tracking number format
        if (!Regex.IsMatch(trackingNumber, @"^LMS-[A-Z0-9]+$"))
        {
            return "Invalid tracking number format. Tracking numbers should be in format: LMS-ABC123";
        }

        try
        {
            var shipment = await _shipmentRepository.GetByTrackingNumberAsync(trackingNumber);

            if (shipment == null)
            {
                return $"❌ No shipment found with tracking number `{trackingNumber}`";
            }

            // Get status emoji
            var statusEmoji = shipment.Status switch
            {
                "Created" => "📝",
                "PickedUp" => "📦",
                "InTransit" => "🚚",
                "OutForDelivery" => "🚛",
                "Delivered" => "✅",
                "Cancelled" => "❌",
                _ => "📦"
            };

            var response = $"{statusEmoji} *Tracking: {trackingNumber}*\n\n" +
                          $"*Status:* {shipment.Status}\n" +
                          $"*Service:* {shipment.ServiceType}\n";

            if (shipment.EstimatedDelivery.HasValue)
            {
                response += $"*Est. Delivery:* {shipment.EstimatedDelivery.Value:MMM dd, yyyy}\n";
            }

            response += $"\n*From:* {shipment.Sender.City}, {shipment.Sender.Country}\n" +
                       $"*To:* {shipment.Receiver.City}, {shipment.Receiver.Country}";

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking shipment {TrackingNumber}", trackingNumber);
            return "Sorry, I encountered an error while tracking your shipment. Please try again.";
        }
    }

    private async Task<string> HandleRatesCommandAsync(string tenantId)
    {
        try
        {
            var rates = await _rateRepository.GetAllAsync();
            rates = rates.Where(r => true); // Tenant filtering handled by repository

            if (!rates.Any())
            {
                return "Rate information is not available at the moment. Please contact support.";
            }

            var response = "💰 *Shipping Rates*\n\n";

            foreach (var rate in rates.OrderBy(r => r.ServiceType))
            {
                var serviceEmoji = rate.ServiceType switch
                {
                    "Standard" => "🐢",
                    "Express" => "🚀",
                    "Overnight" => "⚡",
                    _ => "📦"
                };

                response += $"{serviceEmoji} *{rate.ServiceType}*\n" +
                           $"Base Rate: ${rate.BaseRate:F2}\n" +
                           $"Additional per kg: ${rate.AdditionalKgRate:F2}\n\n";
            }

            response += "_Rates are calculated based on weight and service type._";

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting rates for tenant {TenantId}", tenantId);
            return "Sorry, I couldn't retrieve rate information. Please try again.";
        }
    }

    private string GetCreateShipmentInstructions()
    {
        return "📦 *Create New Shipment*\n\n" +
               "To create a shipment, you can:\n\n" +
               "1. Describe your shipment in plain language, e.g.:\n" +
               "   _\"I need to send a 5kg package from Colombo to Kandy\"_\n\n" +
               "2. Or visit our dashboard to create shipments with full details.\n\n" +
               "Just send me a message and I'll help you get started!";
    }

    private string GetComplaintInstructions()
    {
        return "📝 *File a Complaint*\n\n" +
               "To file a complaint:\n\n" +
               "1. Tell me about your issue in plain language, e.g.:\n" +
               "   _\"My package LMS-ABC123 is delayed\"_\n\n" +
               "2. I'll help you file a formal complaint.\n\n" +
               "Please include your tracking number if applicable.";
    }
}
