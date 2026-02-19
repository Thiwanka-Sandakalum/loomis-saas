namespace CoreCourierService.Api.DTOs;

public record TelegramChatResponse(
    string ChatId,
    string? UserName,
    string? FirstName,
    string? LastName,
    DateTime CreatedAt,
    DateTime? LastMessageAt,
    int MessageCount
);

public record TelegramMessageResponse(
    string MessageId,
    string ChatId,
    string FromUser,
    string Text,
    string Direction,
    DateTime Timestamp,
    string? SessionId
);

public record TelegramChatListResponse(
    List<TelegramChatResponse> Chats,
    int Total,
    int Skip,
    int Limit
);

public record TelegramMessageListResponse(
    List<TelegramMessageResponse> Messages,
    int Total,
    int Skip,
    int Limit
);

public record SendTelegramMessageRequest(
    string ChatId,
    string Text
);
