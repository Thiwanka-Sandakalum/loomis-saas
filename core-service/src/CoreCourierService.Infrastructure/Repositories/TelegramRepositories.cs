using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace CoreCourierService.Infrastructure.Repositories;

public class TelegramChatRepository : ITelegramChatRepository
{
    private readonly IMongoCollection<TelegramChat> _chats;

    public TelegramChatRepository(IOptions<MongoDbSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        var database = client.GetDatabase(settings.Value.DatabaseName);
        _chats = database.GetCollection<TelegramChat>("telegram_chats");

        CreateIndexes();
    }

    private void CreateIndexes()
    {
        var tenantChatIndex = Builders<TelegramChat>.IndexKeys
            .Ascending(c => c.TenantId)
            .Ascending(c => c.ChatId);
        _chats.Indexes.CreateOne(new CreateIndexModel<TelegramChat>(tenantChatIndex,
            new CreateIndexOptions { Unique = true }));

        var activeChatsIndex = Builders<TelegramChat>.IndexKeys
            .Ascending(c => c.TenantId)
            .Ascending(c => c.IsActive)
            .Descending(c => c.LastMessageAt);
        _chats.Indexes.CreateOne(new CreateIndexModel<TelegramChat>(activeChatsIndex));
    }

    public async Task<TelegramChat?> GetByChatIdAsync(string chatId, string tenantId)
    {
        return await _chats.Find(c => c.ChatId == chatId && c.TenantId == tenantId)
            .FirstOrDefaultAsync();
    }

    public async Task<List<TelegramChat>> GetAllChatsAsync(string tenantId, int skip = 0, int limit = 50)
    {
        return await _chats.Find(c => c.TenantId == tenantId && c.IsActive)
            .SortByDescending(c => c.LastMessageAt)
            .Skip(skip)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<TelegramChat> CreateAsync(TelegramChat chat)
    {
        await _chats.InsertOneAsync(chat);
        return chat;
    }

    public async Task<TelegramChat?> UpdateAsync(string chatId, TelegramChat chat)
    {
        var result = await _chats.FindOneAndReplaceAsync(
            c => c.ChatId == chatId && c.TenantId == chat.TenantId,
            chat,
            new FindOneAndReplaceOptions<TelegramChat> { ReturnDocument = ReturnDocument.After }
        );
        return result;
    }

    public async Task<bool> DeleteAsync(string chatId, string tenantId)
    {
        var result = await _chats.DeleteOneAsync(c => c.ChatId == chatId && c.TenantId == tenantId);
        return result.DeletedCount > 0;
    }
}

public class TelegramMessageRepository : ITelegramMessageRepository
{
    private readonly IMongoCollection<TelegramMessage> _messages;

    public TelegramMessageRepository(IOptions<MongoDbSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        var database = client.GetDatabase(settings.Value.DatabaseName);
        _messages = database.GetCollection<TelegramMessage>("telegram_messages");

        CreateIndexes();
    }

    private void CreateIndexes()
    {
        var chatMessagesIndex = Builders<TelegramMessage>.IndexKeys
            .Ascending(m => m.TenantId)
            .Ascending(m => m.ChatId)
            .Descending(m => m.Timestamp);
        _messages.Indexes.CreateOne(new CreateIndexModel<TelegramMessage>(chatMessagesIndex));

        var sessionIndex = Builders<TelegramMessage>.IndexKeys
            .Ascending(m => m.TenantId)
            .Ascending(m => m.SessionId);
        _messages.Indexes.CreateOne(new CreateIndexModel<TelegramMessage>(sessionIndex));
    }

    public async Task<TelegramMessage?> GetByIdAsync(string id, string tenantId)
    {
        return await _messages.Find(m => m.Id == id && m.TenantId == tenantId)
            .FirstOrDefaultAsync();
    }

    public async Task<List<TelegramMessage>> GetChatMessagesAsync(string chatId, string tenantId, int skip = 0, int limit = 100)
    {
        return await _messages.Find(m => m.ChatId == chatId && m.TenantId == tenantId)
            .SortByDescending(m => m.Timestamp)
            .Skip(skip)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<TelegramMessage> CreateAsync(TelegramMessage message)
    {
        await _messages.InsertOneAsync(message);
        return message;
    }

    public async Task<int> GetChatMessageCountAsync(string chatId, string tenantId)
    {
        return (int)await _messages.CountDocumentsAsync(m => m.ChatId == chatId && m.TenantId == tenantId);
    }
}
