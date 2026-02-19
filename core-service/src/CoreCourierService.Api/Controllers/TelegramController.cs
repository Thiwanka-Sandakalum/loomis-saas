using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/telegram")]
public class TelegramController : ControllerBase
{
    private readonly TelegramChatService _chatService;
    private readonly ILogger<TelegramController> _logger;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public TelegramController(
        TelegramChatService chatService,
        ILogger<TelegramController> logger,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _chatService = chatService;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
        _configuration = configuration;
    }

    /// <summary>
    /// Get all Telegram chats for tenant
    /// </summary>
    [HttpGet("chats")]
    public async Task<ActionResult<TelegramChatListResponse>> GetChats([FromQuery] int skip = 0, [FromQuery] int limit = 50)
    {
        var chats = await _chatService.GetAllChatsAsync(skip, limit);

        var chatResponses = new List<TelegramChatResponse>();
        foreach (var chat in chats)
        {
            var messageCount = await _chatService.GetChatMessageCountAsync(chat.ChatId);
            chatResponses.Add(new TelegramChatResponse(
                chat.ChatId,
                chat.UserName,
                chat.FirstName,
                chat.LastName,
                chat.CreatedAt,
                chat.LastMessageAt,
                messageCount
            ));
        }

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
    [HttpPost("webhook")]
    [AllowAnonymous] // Telegram sends unauthenticated requests
    public async Task<IActionResult> Webhook([FromBody] TelegramUpdate update)
    {
        try
        {
            // Resolve tenant from bot token or webhook URL parameter
            // For now, we'll need the tenant context set via middleware or query param

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
            var aiResponse = await _httpClient.PostAsJsonAsync(
                $"{brainServiceUrl}/telegram/message",
                new
                {
                    chatId,
                    text = messageText,
                    sessionId = session.SessionId,
                    from = fromUser
                }
            );

            if (aiResponse.IsSuccessStatusCode)
            {
                var result = await aiResponse.Content.ReadFromJsonAsync<BrainServiceResponse>();
                if (result?.Response != null)
                {
                    // Save outbound message
                    await _chatService.SaveMessageAsync(
                        chatId,
                        0, // Bot messages don't have Telegram message IDs yet
                        "bot",
                        result.Response,
                        "outbound",
                        session.SessionId
                    );

                    // Send response back to Telegram
                    await SendTelegramMessageAsync(chatId, result.Response);
                }
            }

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
            return StatusCode(500, new { success = false, message = ex.Message });
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

public record BrainServiceResponse(
    string? Response,
    string? SessionId
);
