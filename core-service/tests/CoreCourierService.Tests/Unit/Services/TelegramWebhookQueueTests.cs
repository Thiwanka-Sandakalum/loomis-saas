using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using FluentAssertions;

namespace CoreCourierService.Tests;

/// <summary>
/// Unit tests for <see cref="TelegramWebhookQueue"/> covering the in-process bounded channel.
/// </summary>
public class TelegramWebhookQueueTests
{
    private static TelegramUpdate MakeUpdate(int id = 1) =>
        new(UpdateId: id);

    // ─── Basic enqueue / dequeue ─────────────────────────────────────────────

    [Fact]
    public async Task QueueAsync_ItemCanBeReadBack()
    {
        var queue = new TelegramWebhookQueue();
        var workItem = new TelegramWebhookWorkItem("tenant-1", MakeUpdate());

        await queue.QueueAsync(workItem);

        var received = await queue.ReadAllAsync(CancellationToken.None)
            .FirstAsync();

        received.Should().Be(workItem);
    }

    [Fact]
    public async Task QueueAsync_MultipleItems_PreservesOrder()
    {
        var queue = new TelegramWebhookQueue();
        var items = Enumerable.Range(1, 5)
            .Select(i => new TelegramWebhookWorkItem($"tenant-{i}", MakeUpdate(i)))
            .ToList();

        foreach (var item in items)
        {
            await queue.QueueAsync(item);
        }

        using var cts = new CancellationTokenSource();
        var received = new List<TelegramWebhookWorkItem>();

        await foreach (var item in queue.ReadAllAsync(cts.Token))
        {
            received.Add(item);
            if (received.Count == items.Count)
            {
                cts.Cancel();
                break;
            }
        }

        received.Should().BeEquivalentTo(items, o => o.WithStrictOrdering());
    }

    [Fact]
    public async Task QueueAsync_CancelledToken_ThrowsTaskCanceledException()
    {
        var queue = new TelegramWebhookQueue();
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        Func<Task> act = async () => await queue.QueueAsync(
            new TelegramWebhookWorkItem("t1", MakeUpdate()), cts.Token);

        await act.Should().ThrowAsync<TaskCanceledException>();
    }

    // ─── WorkItem record ─────────────────────────────────────────────────────

    [Fact]
    public void WorkItem_RecordEquality_SameValues_AreEqual()
    {
        var update = MakeUpdate(99);
        var a = new TelegramWebhookWorkItem("tenant-x", update);
        var b = new TelegramWebhookWorkItem("tenant-x", update);

        a.Should().Be(b);
    }

    [Fact]
    public void WorkItem_RecordEquality_DifferentTenantId_NotEqual()
    {
        var update = MakeUpdate(1);
        var a = new TelegramWebhookWorkItem("tenant-a", update);
        var b = new TelegramWebhookWorkItem("tenant-b", update);

        a.Should().NotBe(b);
    }

    // ─── ITelegramWebhookQueue interface ─────────────────────────────────────

    [Fact]
    public async Task TelegramWebhookQueue_ImplementsInterface()
    {
        ITelegramWebhookQueue queue = new TelegramWebhookQueue();
        var workItem = new TelegramWebhookWorkItem("t", MakeUpdate());

        // Interface method accessible and does not throw
        Func<Task> act = async () => await queue.QueueAsync(workItem);
        await act.Should().NotThrowAsync();
    }
}
