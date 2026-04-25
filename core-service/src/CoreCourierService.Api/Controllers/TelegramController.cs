using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using CoreCourierService.Core;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/telegram")]
public class TelegramController : ControllerBase
{
    private readonly ITelegramChatService _chatService;
    private readonly ILogger<TelegramController> _logger;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly CoreCourierService.Core.Interfaces.ITenantContext _tenantContext;
    private readonly ITenantIntegrationRepository _integrationRepository;

    public TelegramController(
        ITelegramChatService chatService,
        ILogger<TelegramController> logger,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        CoreCourierService.Core.Interfaces.ITenantContext tenantContext,
        ITenantIntegrationRepository integrationRepository)
    {
        _chatService = chatService;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
        _configuration = configuration;
        _tenantContext = tenantContext;
        _integrationRepository = integrationRepository;
    }

    /// <summary>
    /// Get all Telegram chats for tenant
    /// </summary>
    [HttpGet("chats")]
    public async Task<ActionResult<TelegramChatListResponse>> GetChats([FromQuery] int skip = 0, [FromQuery] int limit = 50)
    {
        var chats = await _chatService.GetAllChatsAsync(skip, limit);

        var countTasks = chats.Select(c => _chatService.GetChatMessageCountAsync(c.ChatId));
        var counts = await Task.WhenAll(countTasks);

        var chatResponses = chats.Select((chat, i) => new TelegramChatResponse(
            chat.ChatId,
            chat.UserName,
            chat.FirstName,
            chat.LastName,
            chat.CreatedAt,
            chat.LastMessageAt,
            counts[i]
        )).ToList();

        return Ok(new TelegramChatListResponse(chatResponses, chatResponses.Count, skip, limit));
    }

    /// <summary>
    /// Get chat message history
    /// </summary>
    [HttpGet("chats/{chatId}/messages")]
    public async Task<ActionResult<TelegramMessageListResponse>> GetChatMessages(
        string chatId,
        [FromQuery] int skip = 0,
        [FromQuery] int limit = 100)
    {
        var messages = await _chatService.GetChatHistoryAsync(chatId, skip, limit);

        var messageResponses = messages.Select(m => new TelegramMessageResponse(
            m.Id,
            m.ChatId,
            m.FromUser,
            m.Text,
            m.Direction,
            m.Timestamp,
            m.SessionId
        )).ToList();

        var total = await _chatService.GetChatMessageCountAsync(chatId);

        return Ok(new TelegramMessageListResponse(messageResponses, total, skip, limit));
    }

    /// <summary>
    /// Telegram webhook endpoint (receives updates from Telegram)
    /// </summary>
    [HttpPost("webhook/{tenantId}")]
    [AllowAnonymous] // Telegram sends unauthenticated requests
    public async Task<IActionResult> Webhook([FromRoute] string tenantId, [FromBody] TelegramUpdate update)
    {
        try
        {
            // Verify Telegram webhook secret token (CRIT-4)
            var integration = await _integrationRepository.GetByTenantIdAndTypeAsync(tenantId, ServiceConstants.IntegrationTypes.Telegram);
            if (integration?.Config is TelegramConfig telegramConfig
                && !string.IsNullOrEmpty(telegramConfig.WebhookSecret))
            {
                var providedSecret = Request.Headers["X-Telegram-Bot-Api-Secret-Token"].FirstOrDefault();
                if (providedSecret != telegramConfig.WebhookSecret)
                {
                    _logger.LogWarning("Telegram webhook secret mismatch for tenant {TenantId}", tenantId);
                    return Unauthorized();
                }
            }

            // Set tenant context from route
            if (!string.IsNullOrEmpty(tenantId))
            {
                _logger.LogInformation("Setting tenant context to {TenantId}", tenantId);
                _tenantContext.SetTenant(tenantId);
            }
            else
            {
                _logger.LogWarning("TenantId missing in webhook route");
                return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "TenantId is required"));
            }

            if (update.Message == null)
            {
                return Ok(); // Ignore non-message updates
            }

            var chatId = update.Message.Chat.Id.ToString();
            var messageText = update.Message.Text ?? "";
            var fromUser = update.Message.From?.Username ?? update.Message.From?.FirstName ?? "Unknown";

            // Get or create chat
            var chat = await _chatService.GetOrCreateChatAsync(
                chatId,
                update.Message.From?.Username,
                update.Message.From?.FirstName,
                update.Message.From?.LastName
            );

            // Get or create session
            var session = await _chatService.GetOrCreateSessionAsync(chatId);

            // Save inbound message
            await _chatService.SaveMessageAsync(
                chatId,
                update.Message.MessageId,
                fromUser,
                messageText,
                "inbound",
                session.SessionId
            );

            // Forward to Brain Service for AI response
            var brainServiceUrl = _configuration["Integrations:BrainService:Url"] ?? "http://localhost:3000";
            // AI response logic removed: BrainServiceResponse type no longer exists. Implement new ADK integration if needed.

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Telegram webhook");
            return Ok(); // Always return 200 to Telegram to avoid retries
        }
    }

    /// <summary>
    /// Send message to Telegram chat
    /// </summary>
    [HttpPost("send")]
    public async Task<IActionResult> SendMessage([FromBody] SendTelegramMessageRequest request)
    {
        try
        {
            await SendTelegramMessageAsync(request.ChatId, request.Text);

            // Save outbound message
            await _chatService.SaveMessageAsync(
                request.ChatId,
                0,
                "agent",
                request.Text,
                "outbound"
            );

            return Ok(new { success = true, message = "Message sent successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending Telegram message");
            return StatusCode(500, ApiErrors.Create("INTERNAL_ERROR", "Failed to send Telegram message"));
        }
    }

    private async Task SendTelegramMessageAsync(string chatId, string text)
    {
        // Get tenant's bot token from integrations
        // For now, using config (should be from tenant integrations)
        var botToken = _configuration["Integrations:Telegram:BotToken"];
        if (string.IsNullOrEmpty(botToken))
        {
            throw new InvalidOperationException("Telegram bot token not configured");
        }

        var url = $"https://api.telegram.org/bot{botToken}/sendMessage";
        await _httpClient.PostAsJsonAsync(url, new
        {
            chat_id = chatId,
            text
        });
    }
}

// Note: Telegram webhook DTOs are defined in IntegrationDTOs.cs
// - TelegramUpdate
// - TelegramMessage
// - TelegramUser
// - TelegramChat
