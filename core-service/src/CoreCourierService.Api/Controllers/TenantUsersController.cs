using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[ApiController]
[Route("api/tenant-users")]
public class TenantUsersController : ControllerBase
{
    private readonly TenantUserService _tenantUserService;
    private readonly ILogger<TenantUsersController> _logger;

    public TenantUsersController(
        TenantUserService tenantUserService,
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
            tu.CreatedAt
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
            return Unauthorized(new { error = "User not authenticated" });
        }

        // Validate role
        var validRoles = new[] { "admin", "csr", "customer" };
        if (!validRoles.Contains(request.Role.ToLower()))
        {
            return BadRequest(new { error = "Invalid role. Must be: admin, csr, or customer" });
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
            tenantUser.CreatedAt
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
            return Unauthorized(new { error = "Auth0 user ID not found" });
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
            tenantUser.CreatedAt
        );

        return CreatedAtAction(nameof(GetTenantUsers), new { id = tenantUser.Id }, response);
    }

    /// <summary>
    /// Update a user's role within the tenant
    /// </summary>
    [HttpPatch("{tenantUserId}/role")]
    public async Task<ActionResult> UpdateUserRole(
        string tenantUserId,
        [FromBody] UpdateTenantUserRoleRequest request)
    {
        // Check if current user is admin
        var currentRole = HttpContext.Items["Role"]?.ToString();
        if (currentRole != "admin")
        {
            return Forbid();
        }

        var validRoles = new[] { "admin", "csr", "customer" };
        if (!validRoles.Contains(request.Role.ToLower()))
        {
            return BadRequest(new { error = "Invalid role. Must be: admin, csr, or customer" });
        }

        var success = await _tenantUserService.UpdateUserRoleAsync(tenantUserId, request.Role);

        if (!success)
        {
            return NotFound(new { error = "Tenant user not found" });
        }

        return Ok(new { message = "Role updated successfully" });
    }

    /// <summary>
    /// Remove a user from the tenant
    /// </summary>
    [HttpDelete("{tenantUserId}")]
    public async Task<ActionResult> RemoveUser(string tenantUserId)
    {
        // Check if current user is admin
        var currentRole = HttpContext.Items["Role"]?.ToString();
        if (currentRole != "admin")
        {
            return Forbid();
        }

        var success = await _tenantUserService.RemoveUserAsync(tenantUserId);

        if (!success)
        {
            return NotFound(new { error = "Tenant user not found" });
        }

        return NoContent();
    }
}
