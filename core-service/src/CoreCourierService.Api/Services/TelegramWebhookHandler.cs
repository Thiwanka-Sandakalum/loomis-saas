using CoreCourierService.Api.DTOs;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using TelegramMessageDto = CoreCourierService.Api.DTOs.TelegramMessage;
using TelegramMessageEntity = CoreCourierService.Core.Entities.TelegramMessage;
using TelegramChatEntity = CoreCourierService.Core.Entities.TelegramChat;

namespace CoreCourierService.Api.Services;

public class TelegramWebhookHandler : ITelegramWebhookHandler
{
    private readonly ITenantIntegrationRepository _repository;
    private readonly IShipmentRepository _shipmentRepository;
    private readonly IRateRepository _rateRepository;
    private readonly ITelegramMessageRepository _messageRepository;
    private readonly ITelegramChatRepository _chatRepository;
    private readonly ILogger<TelegramWebhookHandler> _logger;
    private readonly HttpClient _httpClient;
    private readonly string? _brainServiceUrl;

    public TelegramWebhookHandler(
        ITenantIntegrationRepository repository,
        IShipmentRepository shipmentRepository,
        IRateRepository rateRepository,
        ITelegramMessageRepository messageRepository,
        ITelegramChatRepository chatRepository,
        ILogger<TelegramWebhookHandler> logger,
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _repository = repository;
        _shipmentRepository = shipmentRepository;
        _rateRepository = rateRepository;
        _messageRepository = messageRepository;
        _chatRepository = chatRepository;
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

        // Only create chat if it does not exist, otherwise update lastMessageAt
        var existingChat = await _chatRepository.GetByChatIdAsync(message.Chat.Id.ToString(), tenantId);
        if (existingChat == null)
        {
            await _chatRepository.CreateAsync(new TelegramChatEntity
            {
                TenantId = tenantId,
                ChatId = message.Chat.Id.ToString(),
                UserName = message.From?.Username,
                FirstName = message.From?.FirstName,
                LastName = message.From?.LastName,
                CreatedAt = DateTime.UtcNow,
                LastMessageAt = DateTime.UtcNow,
                IsActive = true
            });
            _logger.LogInformation("[TelegramWebhook] Created new chat for chatId={ChatId} tenantId={TenantId}", message.Chat.Id, tenantId);
        }
        else
        {
            existingChat.LastMessageAt = DateTime.UtcNow;
            await _chatRepository.UpdateAsync(existingChat.ChatId, existingChat);
            _logger.LogInformation("[TelegramWebhook] Updated lastMessageAt for chatId={ChatId} tenantId={TenantId}", message.Chat.Id, tenantId);
        }

        _logger.LogInformation(
            "Processing Telegram message from user {UserId} for tenant {TenantId}",
            message.From?.Id ?? 0,
            tenantId);

        // Save inbound message
        await _messageRepository.CreateAsync(new TelegramMessageEntity
        {
            TenantId = tenantId,
            ChatId = message.Chat.Id.ToString(),
            MessageId = message.MessageId,
            FromUser = message.From?.Username ?? message.From?.FirstName ?? message.From?.Id.ToString() ?? "Unknown",
            Text = message.Text ?? string.Empty,
            Direction = "inbound",
            Timestamp = DateTime.UtcNow
        });

        // Check if it's a command
        if (!string.IsNullOrEmpty(message.Text) && message.Text.StartsWith("/"))
        {
            await HandleCommandAsync(integration, message, tenantId);
        }
        else if (config.ForwardToBrain && !string.IsNullOrEmpty(_brainServiceUrl))
        {
            // Forward natural language messages to AI Brain
            await ForwardToBrainServiceAsync(integration, message, tenantId);
        }
        else if (config.AutoReplyEnabled)
        {
            // Send auto-reply
            await SendMessageAsync(
                config.BotToken,
                message.Chat.Id.ToString(),
                "Thank you for your message. Our team will get back to you shortly.",
                tenantId);
        }
    }

    public async Task HandleCommandAsync(TenantIntegration integration, object messageObj, string tenantId)
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
                $"Sorry, the command `{command}` is not available.",
                tenantId);
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

        await SendMessageAsync(config.BotToken, message.Chat.Id.ToString(), response, tenantId);
    }

    public async Task ForwardToBrainServiceAsync(TenantIntegration integration, object messageObj, string tenantId)
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

        // Prepare ADK session info
        var appName = "agent"; // Must match ADK agent name
                               // var userId = "sandbox_user"; // Use a static or mapped user for now (update as needed)
                               // var sessionId = $"sandbox_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{Guid.NewGuid().ToString("N").Substring(0, 6)}";
        var userId = $"telegram_{message.From.Id}";
        var sessionId = message.Chat.Id.ToString();
        // Step 1: Create session (ignore error if already exists)
        try
        {
            var sessionUrl = $"{_brainServiceUrl.TrimEnd('/')}/apps/{appName}/users/{userId}/sessions/{sessionId}";
            var sessionResponse = await _httpClient.PostAsJsonAsync(sessionUrl, new { });
            if (sessionResponse.StatusCode == System.Net.HttpStatusCode.Conflict ||
                sessionResponse.StatusCode == System.Net.HttpStatusCode.BadRequest)
            {
                _logger.LogInformation("Session already exists or BadRequest for user {UserId} and session {SessionId}, continuing to /run", userId, sessionId);
                // This is not an error, continue to /run
            }
            else if (!sessionResponse.IsSuccessStatusCode)
            {
                _logger.LogError("Failed to create session with brain-service. Status: {StatusCode}", sessionResponse.StatusCode);
                await SendMessageAsync(
                    config.BotToken,
                    message.Chat.Id.ToString(),
                    "I'm having trouble creating a session with our AI service. Please try again later.",
                    tenantId);
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating session with brain-service");
            await SendMessageAsync(
                config.BotToken,
                message.Chat.Id.ToString(),
                "Sorry, I encountered an error creating a session with our AI service. Please try again or contact support.",
                tenantId);
            return;
        }

        // Step 2: Call /run
        var adkRequest = new AdkRunRequest
        {
            AppName = appName,
            UserId = userId,
            SessionId = sessionId,
            NewMessage = new AdkNewMessage
            {
                Role = "user",
                Parts = new List<AdkMessagePart> { new AdkMessagePart { Text = message.Text } }
            }
        };

        try
        {
            var response = await _httpClient.PostAsJsonAsync(
                $"{_brainServiceUrl.TrimEnd('/')}/run",
                adkRequest);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Brain service returned error status {StatusCode}", response.StatusCode);
                await SendMessageAsync(
                    config.BotToken,
                    message.Chat.Id.ToString(),
                    "I'm having trouble processing your request right now. Please try again later or use /help for available commands.",
                    tenantId);
                return;
            }

            // Parse ADK events array and extract reply, functionCall, functionResponse, or errorMessage
            var events = await response.Content.ReadFromJsonAsync<List<AdkEvent>>();
            string? reply = null;
            string? error = null;

            if (events != null)
            {
                // 1. Prefer plain text reply
                reply = events.SelectMany(e => e.Content?.Parts ?? new List<AdkMessagePart>())
                    .Select(p => p.Text)
                    .FirstOrDefault(t => !string.IsNullOrWhiteSpace(t));

                // 2. If no text, check for functionResponse
                if (reply == null)
                {
                    reply = events.SelectMany(e => e.Content?.Parts ?? new List<AdkMessagePart>())
                        .Select(p => p.FunctionResponse?.Response?.ToString())
                        .FirstOrDefault(r => !string.IsNullOrWhiteSpace(r));
                }

                // 3. If no text or functionResponse, check for errorMessage
                if (reply == null)
                {
                    error = events.FirstOrDefault(e => !string.IsNullOrWhiteSpace(e.ErrorMessage))?.ErrorMessage;
                }
            }

            if (!string.IsNullOrWhiteSpace(reply))
            {
                await SendMessageAsync(config.BotToken, message.Chat.Id.ToString(), reply, tenantId);
                _logger.LogInformation("Successfully processed message via Brain service for tenant {TenantId}", integration.TenantId);
            }
            else if (!string.IsNullOrWhiteSpace(error))
            {
                _logger.LogError("Brain service error: {Error}", error);
                await SendMessageAsync(
                    config.BotToken,
                    message.Chat.Id.ToString(),
                    $"AI error: {error}",
                    tenantId);
            }
            else
            {
                _logger.LogError("No valid reply found in Brain service response");
                await SendMessageAsync(
                    config.BotToken,
                    message.Chat.Id.ToString(),
                    "I'm having trouble processing your request right now. Please try again later or use /help for available commands.",
                    tenantId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error forwarding message to Brain service");
            await SendMessageAsync(
                config.BotToken,
                message.Chat.Id.ToString(),
                "Sorry, I encountered an error processing your request. Please try again or contact support.",
                tenantId);
        }
    }

    public async Task SendMessageAsync(string botToken, string chatId, string text, string tenantId, string? parseMode = "Markdown")
    {
        try
        {
            // Always use provided tenantId
            await _messageRepository.CreateAsync(new TelegramMessageEntity
            {
                TenantId = tenantId,
                ChatId = chatId,
                MessageId = 0, // Telegram will assign its own ID
                FromUser = "bot",
                Text = text,
                Direction = "outbound",
                Timestamp = DateTime.UtcNow
            });

            // Only create chat if it does not exist, otherwise update lastMessageAt
            var existingChat = await _chatRepository.GetByChatIdAsync(chatId, tenantId);
            if (existingChat == null)
            {
                await _chatRepository.CreateAsync(new TelegramChatEntity
                {
                    TenantId = tenantId,
                    ChatId = chatId,
                    UserName = null, // Not available for outbound
                    FirstName = null,
                    LastName = null,
                    CreatedAt = DateTime.UtcNow,
                    LastMessageAt = DateTime.UtcNow,
                    IsActive = true
                });
                _logger.LogInformation("[TelegramWebhook] Created new chat (outbound) for chatId={ChatId} tenantId={TenantId}", chatId, tenantId);
            }
            else
            {
                existingChat.LastMessageAt = DateTime.UtcNow;
                await _chatRepository.UpdateAsync(existingChat.ChatId, existingChat);
                _logger.LogInformation("[TelegramWebhook] Updated lastMessageAt (outbound) for chatId={ChatId} tenantId={TenantId}", chatId, tenantId);
            }

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
