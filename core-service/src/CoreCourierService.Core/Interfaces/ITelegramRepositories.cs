using CoreCourierService.Core.Entities;

namespace CoreCourierService.Core.Interfaces;

public interface ITelegramChatRepository
{
    Task<TelegramChat?> GetByChatIdAsync(string chatId, string tenantId);
    Task<List<TelegramChat>> GetAllChatsAsync(string tenantId, int skip = 0, int limit = 50);
    Task<TelegramChat> CreateAsync(TelegramChat chat);
    Task<TelegramChat?> UpdateAsync(string chatId, TelegramChat chat);
    Task<bool> DeleteAsync(string chatId, string tenantId);
}

public interface ITelegramMessageRepository
{
    Task<TelegramMessage?> GetByIdAsync(string id, string tenantId);
    Task<List<TelegramMessage>> GetChatMessagesAsync(string chatId, string tenantId, int skip = 0, int limit = 100);
    Task<TelegramMessage> CreateAsync(TelegramMessage message);
    Task<int> GetChatMessageCountAsync(string chatId, string tenantId);
}
