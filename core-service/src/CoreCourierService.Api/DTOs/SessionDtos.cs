using MongoDB.Bson;

namespace CoreCourierService.Api.DTOs;

public record CreateSessionRequest(
    string UserId,
    string Channel,
    int ExpiryHours = 24
);

public record UpdateSessionDataRequest(
    BsonDocument Data
);

public record SessionResponse(
    string SessionId,
    string UserId,
    string Channel,
    BsonDocument Data,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    DateTime ExpiresAt,
    bool IsActive
);

public record SessionListResponse(
    List<SessionResponse> Sessions,
    int Total
);
