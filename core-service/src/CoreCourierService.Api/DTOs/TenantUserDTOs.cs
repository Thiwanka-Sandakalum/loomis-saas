using CoreCourierService.Core.Entities;

namespace CoreCourierService.Api.DTOs;

// ==================== TENANT USER DTOs ====================

public record CreateTenantUserRequest(
    string Email,
    string Role,
    string? Name = null
);

public record InviteTenantUserRequest(
    string Email,
    string Role,
    string? Message = null
);

public record UpdateTenantUserRoleRequest(
    string Role
);

public record TenantUserResponse(
    string Id,
    string Auth0UserId,
    string TenantId,
    string Email,
    string? Name,
    string Role,
    string Status,
    DateTime? InvitedAt,
    string? InvitedBy,
    DateTime CreatedAt
);
