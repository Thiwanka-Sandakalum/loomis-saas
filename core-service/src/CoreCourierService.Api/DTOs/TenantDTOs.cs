namespace CoreCourierService.Api.DTOs;

public record CreateTenantRequest(
    string Name,
    string Plan);

public record TenantResponse(
    string Id,
    string Name,
    string ApiKey,
    string Plan,
    DateTime CreatedAt);
