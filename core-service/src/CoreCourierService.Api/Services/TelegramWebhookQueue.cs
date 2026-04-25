using System.Threading.Channels;
using CoreCourierService.Api.DTOs;
using CoreCourierService.Core.Interfaces;

namespace CoreCourierService.Api.Services;

public interface ITelegramWebhookQueue
{
    ValueTask QueueAsync(TelegramWebhookWorkItem workItem, CancellationToken cancellationToken = default);
    int PendingCount { get; }
}

public sealed record TelegramWebhookWorkItem(string TenantId, TelegramUpdate Update);

public sealed class TelegramWebhookQueue : ITelegramWebhookQueue
{
    private readonly Channel<TelegramWebhookWorkItem> _channel;

    public TelegramWebhookQueue()
    {
        _channel = Channel.CreateBounded<TelegramWebhookWorkItem>(new BoundedChannelOptions(200)
        {
            FullMode = BoundedChannelFullMode.Wait,
            SingleReader = true,
            SingleWriter = false
        });
    }

    public ValueTask QueueAsync(TelegramWebhookWorkItem workItem, CancellationToken cancellationToken = default)
    {
        return _channel.Writer.WriteAsync(workItem, cancellationToken);
    }

    /// <summary>Returns the number of items currently waiting in the channel.</summary>
    public int PendingCount => _channel.Reader.Count;

    public IAsyncEnumerable<TelegramWebhookWorkItem> ReadAllAsync(CancellationToken cancellationToken)
    {
        return _channel.Reader.ReadAllAsync(cancellationToken);
    }
}

public sealed class TelegramWebhookBackgroundService : BackgroundService
{
    private const int MaxRetries = 3;
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(2);
    private static readonly TimeSpan QueueDepthLogInterval = TimeSpan.FromMinutes(1);

    private readonly TelegramWebhookQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<TelegramWebhookBackgroundService> _logger;

    public TelegramWebhookBackgroundService(
        TelegramWebhookQueue queue,
        IServiceScopeFactory scopeFactory,
        ILogger<TelegramWebhookBackgroundService> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var lastDepthLog = DateTime.UtcNow;

        await foreach (var workItem in _queue.ReadAllAsync(stoppingToken))
        {
            // Periodically log queue depth so ops teams can detect backpressure
            if (DateTime.UtcNow - lastDepthLog >= QueueDepthLogInterval)
            {
                _logger.LogInformation(
                    "TelegramWebhookQueue depth: {Depth}", _queue.PendingCount);
                lastDepthLog = DateTime.UtcNow;
            }

            await ProcessWithRetryAsync(workItem, stoppingToken);
        }
    }

    private async Task ProcessWithRetryAsync(TelegramWebhookWorkItem workItem, CancellationToken stoppingToken)
    {
        for (var attempt = 1; attempt <= MaxRetries; attempt++)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var webhookHandler = scope.ServiceProvider.GetRequiredService<ITelegramWebhookHandler>();
                await webhookHandler.HandleUpdateAsync(workItem.TenantId, workItem.Update);
                return; // success
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex) when (attempt < MaxRetries)
            {
                _logger.LogWarning(ex,
                    "Transient error processing Telegram webhook for tenant {TenantId} (attempt {Attempt}/{Max}). Retrying in {Delay}s.",
                    workItem.TenantId, attempt, MaxRetries, RetryDelay.TotalSeconds);

                await Task.Delay(RetryDelay, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Failed to process Telegram webhook for tenant {TenantId} after {Max} attempts. Dropping item.",
                    workItem.TenantId, MaxRetries);
            }
        }
    }
}