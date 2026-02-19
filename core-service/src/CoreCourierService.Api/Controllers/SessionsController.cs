using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/sessions")]
public class SessionsController : ControllerBase
{
    private readonly SessionService _sessionService;

    public SessionsController(SessionService sessionService)
    {
        _sessionService = sessionService;
    }

    /// <summary>
    /// Create a new session
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<SessionResponse>> CreateSession([FromBody] CreateSessionRequest request)
    {
        var session = await _sessionService.CreateSessionAsync(
            request.UserId,
            request.Channel,
            request.ExpiryHours
        );

        return Ok(new SessionResponse(
            session.SessionId,
            session.UserId,
            session.Channel,
            session.Data,
            session.CreatedAt,
            session.UpdatedAt,
            session.ExpiresAt,
            session.IsActive
        ));
    }

    /// <summary>
    /// Get session by session ID
    /// </summary>
    [HttpGet("{sessionId}")]
    public async Task<ActionResult<SessionResponse>> GetSession(string sessionId)
    {
        var session = await _sessionService.GetSessionAsync(sessionId);
        if (session == null)
        {
            return NotFound(new { message = "Session not found" });
        }

        return Ok(new SessionResponse(
            session.SessionId,
            session.UserId,
            session.Channel,
            session.Data,
            session.CreatedAt,
            session.UpdatedAt,
            session.ExpiresAt,
            session.IsActive
        ));
    }

    /// <summary>
    /// Get all sessions for a user
    /// </summary>
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<SessionListResponse>> GetUserSessions(string userId)
    {
        var sessions = await _sessionService.GetUserSessionsAsync(userId);

        var sessionResponses = sessions.Select(s => new SessionResponse(
            s.SessionId,
            s.UserId,
            s.Channel,
            s.Data,
            s.CreatedAt,
            s.UpdatedAt,
            s.ExpiresAt,
            s.IsActive
        )).ToList();

        return Ok(new SessionListResponse(sessionResponses, sessionResponses.Count));
    }

    /// <summary>
    /// Get all active sessions for tenant
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<SessionListResponse>> GetActiveSessions()
    {
        var sessions = await _sessionService.GetActiveSessionsAsync();

        var sessionResponses = sessions.Select(s => new SessionResponse(
            s.SessionId,
            s.UserId,
            s.Channel,
            s.Data,
            s.CreatedAt,
            s.UpdatedAt,
            s.ExpiresAt,
            s.IsActive
        )).ToList();

        return Ok(new SessionListResponse(sessionResponses, sessionResponses.Count));
    }

    /// <summary>
    /// Update session data
    /// </summary>
    [HttpPut("{sessionId}")]
    public async Task<ActionResult<SessionResponse>> UpdateSessionData(
        string sessionId,
        [FromBody] UpdateSessionDataRequest request)
    {
        var session = await _sessionService.UpdateSessionDataAsync(sessionId, request.Data);
        if (session == null)
        {
            return NotFound(new { message = "Session not found" });
        }

        return Ok(new SessionResponse(
            session.SessionId,
            session.UserId,
            session.Channel,
            session.Data,
            session.CreatedAt,
            session.UpdatedAt,
            session.ExpiresAt,
            session.IsActive
        ));
    }

    /// <summary>
    /// Extend session expiry
    /// </summary>
    [HttpPost("{sessionId}/extend")]
    public async Task<ActionResult<SessionResponse>> ExtendSession(string sessionId, [FromQuery] int hours = 24)
    {
        var session = await _sessionService.ExtendSessionAsync(sessionId, hours);
        if (session == null)
        {
            return NotFound(new { message = "Session not found" });
        }

        return Ok(new SessionResponse(
            session.SessionId,
            session.UserId,
            session.Channel,
            session.Data,
            session.CreatedAt,
            session.UpdatedAt,
            session.ExpiresAt,
            session.IsActive
        ));
    }

    /// <summary>
    /// Invalidate (delete) a session
    /// </summary>
    [HttpDelete("{sessionId}")]
    public async Task<ActionResult> InvalidateSession(string sessionId)
    {
        var result = await _sessionService.InvalidateSessionAsync(sessionId);
        if (!result)
        {
            return NotFound(new { message = "Session not found" });
        }

        return Ok(new { message = "Session invalidated successfully" });
    }

    /// <summary>
    /// Invalidate all sessions for a user
    /// </summary>
    [HttpDelete("user/{userId}")]
    public async Task<ActionResult> InvalidateUserSessions(string userId)
    {
        var result = await _sessionService.InvalidateUserSessionsAsync(userId);
        return Ok(new { message = $"User sessions invalidated", success = result });
    }

    /// <summary>
    /// Cleanup expired sessions (maintenance endpoint)
    /// </summary>
    [HttpPost("cleanup")]
    public async Task<ActionResult> CleanupExpiredSessions()
    {
        var count = await _sessionService.CleanupExpiredSessionsAsync();
        return Ok(new { message = $"Cleaned up {count} expired sessions" });
    }
}
