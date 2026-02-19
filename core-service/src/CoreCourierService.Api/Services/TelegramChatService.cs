using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;

namespace CoreCourierService.Api.Services;

public class TelegramChatService
{
    private readonly ITelegramChatRepository _chatRepository;
    private readonly ITelegramMessageRepository _messageRepository;
    private readonly ITenantContext _tenantContext;
    private readonly SessionService _sessionService;

    public TelegramChatService(
        ITelegramChatRepository chatRepository,
        ITelegramMessageRepository messageRepository,
        ITenantContext tenantContext,
        SessionService sessionService)
    {
        _chatRepository = chatRepository;
        _messageRepository = messageRepository;
        _tenantContext = tenantContext;
        _sessionService = sessionService;
    }

    public async Task<TelegramChat> GetOrCreateChatAsync(string chatId, string? userName, string? firstName, string? lastName)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        var existingChat = await _chatRepository.GetByChatIdAsync(chatId, tenantId);
        if (existingChat != null)
        {
            existingChat.LastMessageAt = DateTime.UtcNow;
            return await _chatRepository.UpdateAsync(chatId, existingChat) ?? existingChat;
        }

        var newChat = new TelegramChat
        {
            TenantId = tenantId,
            ChatId = chatId,
            UserName = userName,
            FirstName = firstName,
            LastName = lastName,
            LastMessageAt = DateTime.UtcNow,
            IsActive = true
        };
        return await _chatRepository.CreateAsync(newChat);
    }

    public async Task<List<TelegramChat>> GetAllChatsAsync(int skip = 0, int limit = 50)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _chatRepository.GetAllChatsAsync(tenantId, skip, limit);
    }

    public async Task<TelegramMessage> SaveMessageAsync(
        string chatId,
        long messageId,
        string fromUser,
        string text,
        string direction,
        string? sessionId = null)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        var message = new TelegramMessage
        {
            TenantId = tenantId,
            ChatId = chatId,
            MessageId = messageId,
            FromUser = fromUser,
            Text = text,
            Direction = direction,
            SessionId = sessionId,
            Timestamp = DateTime.UtcNow
        };
        return await _messageRepository.CreateAsync(message);
    }

    public async Task<List<TelegramMessage>> GetChatHistoryAsync(string chatId, int skip = 0, int limit = 100)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _messageRepository.GetChatMessagesAsync(chatId, tenantId, skip, limit);
    }

    public async Task<int> GetChatMessageCountAsync(string chatId)
    {
        var tenantId = _tenantContext.TenantId ?? throw new InvalidOperationException("TenantId not set");
        return await _messageRepository.GetChatMessageCountAsync(chatId, tenantId);
    }

    public async Task<Session> GetOrCreateSessionAsync(string chatId)
    {
        var userId = $"telegram_{chatId}";
        var existingSessions = await _sessionService.GetUserSessionsAsync(userId);

        if (existingSessions.Any(s => s.IsActive))
        {
            return existingSessions.First();
        }

        return await _sessionService.CreateSessionAsync(userId, "telegram", 720); // 30 days
    }
}
