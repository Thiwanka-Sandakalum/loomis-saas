using CoreCourierService.Api.DTOs;
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
    private readonly ITelegramWebhookHandler _webhookHandler;
    private readonly ILogger<IntegrationsController> _logger;

    public IntegrationsController(
        ITelegramIntegrationService telegramService,
        ITelegramWebhookHandler webhookHandler,
        ILogger<IntegrationsController> logger)
    {
        _telegramService = telegramService;
        _webhookHandler = webhookHandler;
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
                return StatusCode(500, new { error = "Invalid configuration type" });
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
            return BadRequest(new
            {
                error = new
                {
                    code = "INVALID_BOT_TOKEN",
                    message = ex.Message
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting up Telegram integration");
            return StatusCode(500, new
            {
                error = new
                {
                    code = "INTERNAL_ERROR",
                    message = "An error occurred while setting up Telegram integration"
                }
            });
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
                return NotFound(new
                {
                    error = new
                    {
                        code = "NOT_FOUND",
                        message = "No Telegram integration found for this tenant"
                    }
                });
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
            return StatusCode(500, new
            {
                error = new
                {
                    code = "INTERNAL_ERROR",
                    message = "An error occurred while disconnecting Telegram bot"
                }
            });
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
            return StatusCode(500, new
            {
                error = new
                {
                    code = "INTERNAL_ERROR",
                    message = "An error occurred while retrieving Telegram status"
                }
            });
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
                return NotFound(new
                {
                    error = new
                    {
                        code = "NOT_FOUND",
                        message = "No Telegram integration found or webhook not configured"
                    }
                });
            }

            return Ok(new { data = webhookInfo });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting webhook info");
            return StatusCode(500, new
            {
                error = new
                {
                    code = "INTERNAL_ERROR",
                    message = "An error occurred while retrieving webhook information"
                }
            });
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
            return StatusCode(500, new
            {
                error = new
                {
                    code = "INTERNAL_ERROR",
                    message = "An error occurred while testing the connection"
                }
            });
        }
    }

    // ==================== TELEGRAM WEBHOOK (PUBLIC) ====================

    [HttpPost("telegram/webhook/{tenantId}")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleTelegramWebhook(
        string tenantId,
        [FromBody] TelegramUpdate update)
    {
        try
        {
            _logger.LogInformation(
                "Received Telegram webhook for tenant {TenantId}, update {UpdateId}",
                tenantId,
                update.UpdateId);

            // Process webhook asynchronously (fire and forget)
            _ = Task.Run(async () =>
            {
                try
                {
                    await _webhookHandler.HandleUpdateAsync(tenantId, update);
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "Error processing Telegram webhook for tenant {TenantId}",
                        tenantId);
                }
            });

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
