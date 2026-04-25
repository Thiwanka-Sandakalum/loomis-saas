using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[ApiController]
[Route("api/integrations")]
public class IntegrationsController : ControllerBase
{
    private readonly ITelegramIntegrationService _telegramService;
    private readonly ITelegramWebhookQueue _webhookQueue;
    private readonly ILogger<IntegrationsController> _logger;

    public IntegrationsController(
        ITelegramIntegrationService telegramService,
        ITelegramWebhookQueue webhookQueue,
        ILogger<IntegrationsController> logger)
    {
        _telegramService = telegramService;
        _webhookQueue = webhookQueue;
        _logger = logger;
    }

    // ==================== TELEGRAM SETUP ====================

    [HttpPost("telegram/setup")]
    [Authorize]
    public async Task<ActionResult<TelegramIntegrationResponse>> SetupTelegram(
        [FromBody] SetupTelegramRequest request)
    {
        try
        {
            var integration = await _telegramService.SetupTelegramBotAsync(request);

            if (integration.Config is not TelegramConfig config)
            {
                return StatusCode(500, ApiErrors.Create("INTERNAL_ERROR", "Invalid configuration type"));
            }

            var response = new TelegramIntegrationResponse(
                Id: integration.Id,
                IntegrationType: integration.IntegrationType,
                IsActive: integration.IsActive,
                Config: new TelegramConfigDto(
                    BotUsername: config.BotUsername,
                    WebhookUrl: config.WebhookUrl,
                    AllowedCommands: config.AllowedCommands,
                    AutoReplyEnabled: config.AutoReplyEnabled,
                    ForwardToBrain: config.ForwardToBrain,
                    GreetingMessage: config.GreetingMessage
                ),
                CreatedAt: integration.CreatedAt,
                UpdatedAt: integration.UpdatedAt
            );

            return Ok(new
            {
                success = true,
                message = "Telegram bot connected successfully",
                data = response
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to setup Telegram bot");
            return BadRequest(ApiErrors.Create("INVALID_BOT_TOKEN", "Bot token validation failed. Please verify your bot token and try again."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting up Telegram integration");
            return StatusCode(500, ApiErrors.Create("INTERNAL_ERROR", "An error occurred while setting up Telegram integration"));
        }
    }

    [HttpDelete("telegram/disconnect")]
    [Authorize]
    public async Task<ActionResult> DisconnectTelegram()
    {
        try
        {
            var result = await _telegramService.DisconnectTelegramBotAsync();

            if (!result)
            {
                return NotFound(ApiErrors.Create("NOT_FOUND", "No Telegram integration found for this tenant"));
            }

            return Ok(new
            {
                success = true,
                message = "Telegram bot disconnected successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error disconnecting Telegram bot");
            return StatusCode(500, ApiErrors.Create("INTERNAL_ERROR", "An error occurred while disconnecting Telegram bot"));
        }
    }

    [HttpGet("telegram/status")]
    [Authorize]
    public async Task<ActionResult<TelegramStatusResponse>> GetTelegramStatus()
    {
        try
        {
            var integration = await _telegramService.GetIntegrationStatusAsync();

            if (integration == null || integration.Config is not TelegramConfig config)
            {
                return Ok(new TelegramStatusResponse(
                    IsConnected: false,
                    BotUsername: null,
                    AutoReplyEnabled: false,
                    ForwardToBrain: false
                ));
            }

            return Ok(new TelegramStatusResponse(
                IsConnected: integration.IsActive,
                BotUsername: config.BotUsername,
                AutoReplyEnabled: config.AutoReplyEnabled,
                ForwardToBrain: config.ForwardToBrain
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Telegram status");
            return StatusCode(500, ApiErrors.Create("INTERNAL_ERROR", "An error occurred while retrieving Telegram status"));
        }
    }

    [HttpGet("telegram/webhook-info")]
    [Authorize]
    public async Task<ActionResult<TelegramWebhookInfo>> GetWebhookInfo()
    {
        try
        {
            var webhookInfo = await _telegramService.GetWebhookInfoAsync();

            if (webhookInfo == null)
            {
                return NotFound(ApiErrors.Create("NOT_FOUND", "No Telegram integration found or webhook not configured"));
            }

            return Ok(new { data = webhookInfo });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting webhook info");
            return StatusCode(500, ApiErrors.Create("INTERNAL_ERROR", "An error occurred while retrieving webhook information"));
        }
    }

    [HttpPost("telegram/test-connection")]
    [Authorize]
    public async Task<ActionResult> TestConnection([FromBody] TestConnectionRequest request)
    {
        try
        {
            var isValid = await _telegramService.TestConnectionAsync(request.BotToken);

            return Ok(new
            {
                success = isValid,
                message = isValid
                    ? "Bot token is valid"
                    : "Bot token is invalid or bot cannot be reached"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing Telegram connection");
            return StatusCode(500, ApiErrors.Create("INTERNAL_ERROR", "An error occurred while testing the connection"));
        }
    }

    // ==================== TELEGRAM WEBHOOK (PUBLIC) ====================

    [HttpPost("telegram/webhook/{tenantId}")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleTelegramWebhook(
        string tenantId)
    {
        try
        {

            // Read and log the raw request body for debugging
            string rawBody = string.Empty;
            Request.EnableBuffering();
            using (var reader = new StreamReader(Request.Body, System.Text.Encoding.UTF8, leaveOpen: true))
            {
                rawBody = await reader.ReadToEndAsync();
                Request.Body.Position = 0;
            }
            _logger.LogInformation("Raw Telegram webhook body: {RawBody}", rawBody);

            TelegramUpdate? update = null;
            try
            {
                update = System.Text.Json.JsonSerializer.Deserialize<TelegramUpdate>(rawBody);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to deserialize TelegramUpdate from webhook body");
                return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "Invalid Telegram update payload"));
            }

            if (update == null)
            {
                _logger.LogWarning("TelegramUpdate is null after deserialization");
                return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "Empty Telegram update"));
            }

            _logger.LogInformation(
                "Received Telegram webhook for tenant {TenantId}, update {UpdateId}",
                tenantId,
                update.UpdateId);

            await _webhookQueue.QueueAsync(new TelegramWebhookWorkItem(tenantId, update), HttpContext.RequestAborted);

            // Return 200 immediately to Telegram
            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error handling Telegram webhook for tenant {TenantId}",
                tenantId);

            // Still return 200 to prevent Telegram from retrying
            return Ok();
        }
    }
}

// ==================== REQUEST MODELS ====================

public record TestConnectionRequest(string BotToken);
