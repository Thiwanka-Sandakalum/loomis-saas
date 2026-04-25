using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using CoreCourierService.Api.Validators;
using Microsoft.AspNetCore.Mvc;
using CoreCourierService.Core;
using Microsoft.AspNetCore.Authorization;

namespace CoreCourierService.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/tenant-users")]
public class TenantUsersController : ControllerBase
{
    private readonly ITenantUserService _tenantUserService;
    private readonly ILogger<TenantUsersController> _logger;

    public TenantUsersController(
        ITenantUserService tenantUserService,
        ILogger<TenantUsersController> logger)
    {
        _tenantUserService = tenantUserService;
        _logger = logger;
    }

    /// <summary>
    /// List all users in the current tenant
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TenantUserResponse>>> GetTenantUsers()
    {
        var tenantUsers = await _tenantUserService.GetTenantUsersAsync();

        var response = tenantUsers.Select(tu => new TenantUserResponse(
            tu.Id,
            tu.Auth0UserId,
            tu.TenantId,
            tu.Email,
            tu.Name,
            tu.Role,
            tu.Status,
            tu.InvitedAt,
            tu.InvitedBy,
            tu.CreatedAt,
            null,
            tu.InvitationExpiresAt
        ));

        return Ok(new { data = response });
    }

    /// <summary>
    /// Invite a new user to the tenant
    /// </summary>
    [HttpPost("invite")]
    public async Task<ActionResult<TenantUserResponse>> InviteUser(
        [FromBody] InviteTenantUserRequest request)
    {
        // Get current user's Auth0 ID from context (set by TenantResolverMiddleware)
        var invitedBy = HttpContext.Items["Auth0UserId"]?.ToString();

        if (string.IsNullOrEmpty(invitedBy))
        {
            return Unauthorized(ApiErrors.Create("UNAUTHORIZED", "User not authenticated"));
        }

        // Validate email format
        if (string.IsNullOrWhiteSpace(request.Email) || !DomainValidator.IsValidEmail(request.Email))
        {
            return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "A valid email address is required"));
        }

        // Validate role
        if (!ServiceConstants.UserRoles.All.Contains(request.Role.ToLower()))
        {
            return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "Invalid role. Must be: admin, csr, or customer"));
        }

        var tenantUser = await _tenantUserService.InviteUserAsync(
            request.Email,
            request.Role,
            invitedBy
        );

        var response = new TenantUserResponse(
            tenantUser.Id,
            tenantUser.Auth0UserId,
            tenantUser.TenantId,
            tenantUser.Email,
            tenantUser.Name,
            tenantUser.Role,
            tenantUser.Status,
            tenantUser.InvitedAt,
            tenantUser.InvitedBy,
            tenantUser.CreatedAt,
            tenantUser.InvitationToken,
            tenantUser.InvitationExpiresAt
        );

        return CreatedAtAction(nameof(GetTenantUsers), new { id = tenantUser.Id }, response);
    }

    /// <summary>
    /// Create tenant user mapping (used when Auth0 user signs up)
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<TenantUserResponse>> CreateTenantUser(
        [FromBody] CreateTenantUserRequest request)
    {
        // This endpoint is typically called internally or via Auth0 Actions/Hooks
        var auth0UserId = HttpContext.Items["Auth0UserId"]?.ToString();

        if (string.IsNullOrEmpty(auth0UserId))
        {
            return Unauthorized(ApiErrors.Create("UNAUTHORIZED", "Auth0 user ID not found"));
        }

        var tenantUser = await _tenantUserService.CreateTenantUserAsync(
            auth0UserId,
            request.Email,
            request.Role,
            request.Name
        );

        var response = new TenantUserResponse(
            tenantUser.Id,
            tenantUser.Auth0UserId,
            tenantUser.TenantId,
            tenantUser.Email,
            tenantUser.Name,
            tenantUser.Role,
            tenantUser.Status,
            tenantUser.InvitedAt,
            tenantUser.InvitedBy,
            tenantUser.CreatedAt,
            null,
            tenantUser.InvitationExpiresAt
        );

        return CreatedAtAction(nameof(GetTenantUsers), new { id = tenantUser.Id }, response);
    }

    /// <summary>
    /// Update a user's role within the tenant
    /// </summary>
    [HttpPatch("{tenantUserId}/role")]
    [Microsoft.AspNetCore.Authorization.Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult> UpdateUserRole(
        string tenantUserId,
        [FromBody] UpdateTenantUserRoleRequest request)
    {
        if (!ServiceConstants.UserRoles.All.Contains(request.Role.ToLower()))
        {
            return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "Invalid role. Must be: admin, csr, or customer"));
        }

        var success = await _tenantUserService.UpdateUserRoleAsync(tenantUserId, request.Role);

        if (!success)
        {
            return NotFound(ApiErrors.Create("NOT_FOUND", "Tenant user not found"));
        }

        return Ok(new { message = "Role updated successfully" });
    }

    /// <summary>
    /// Remove a user from the tenant
    /// </summary>
    [HttpDelete("{tenantUserId}")]
    [Microsoft.AspNetCore.Authorization.Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult> RemoveUser(string tenantUserId)
    {
        var success = await _tenantUserService.RemoveUserAsync(tenantUserId);

        if (!success)
        {
            return NotFound(ApiErrors.Create("NOT_FOUND", "Tenant user not found"));
        }

        return NoContent();
    }

    /// <summary>
    /// Resend a pending invitation (rotates token + resets 7-day expiry)
    /// </summary>
    [HttpPost("invite/resend")]
    [Microsoft.AspNetCore.Authorization.Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult<TenantUserResponse>> ResendInvitation(
        [FromBody] ResendInvitationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !DomainValidator.IsValidEmail(request.Email))
        {
            return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "A valid email address is required"));
        }

        var updated = await _tenantUserService.ResendInvitationAsync(request.Email);

        if (updated == null)
        {
            return NotFound(ApiErrors.Create("NOT_FOUND", "No pending invitation found for this email"));
        }

        var response = new TenantUserResponse(
            updated.Id,
            updated.Auth0UserId,
            updated.TenantId,
            updated.Email,
            updated.Name,
            updated.Role,
            updated.Status,
            updated.InvitedAt,
            updated.InvitedBy,
            updated.CreatedAt,
            updated.InvitationToken,
            updated.InvitationExpiresAt
        );

        return Ok(response);
    }

    /// <summary>
    /// Revoke a pending invitation
    /// </summary>
    [HttpDelete("invite/{tenantUserId}")]
    [Microsoft.AspNetCore.Authorization.Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult> RevokeInvitation(string tenantUserId)
    {
        var success = await _tenantUserService.RevokeInvitationAsync(tenantUserId);

        if (!success)
        {
            return NotFound(ApiErrors.Create("NOT_FOUND", "No pending invitation found"));
        }

        return NoContent();
    }
}
