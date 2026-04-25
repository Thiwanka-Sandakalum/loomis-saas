using System.Security.Claims;
using CoreCourierService.Api.Middleware;
using CoreCourierService.Api.Services;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;

namespace CoreCourierService.Tests;

public class TenantResolverMiddlewareTests
{
    private readonly Mock<ITenantContext> _tenantContextMock = new();
    private readonly Mock<ITenantService> _tenantServiceMock = new();
    private readonly Mock<ITenantUserService> _tenantUserServiceMock = new();
    private readonly Mock<ILogger<TenantResolverMiddleware>> _loggerMock = new();

    [Fact]
    public async Task InvokeAsync_SetsContextItems_WhenUserFound()
    {
        var nextCalled = false;
        RequestDelegate next = _ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        };

        var middleware = new TenantResolverMiddleware(next);
        var context = NewHttpContextWithAuth0Sub("auth0|abc");

        var tenantUser = new TenantUser
        {
            TenantId = "tenant-1",
            Role = "admin"
        };

        var tenant = new Tenant
        {
            Id = "tenant-1",
            Plan = "pro"
        };

        _tenantUserServiceMock
            .Setup(x => x.GetByAuth0UserIdAsync("auth0|abc"))
            .ReturnsAsync(tenantUser);
        _tenantServiceMock
            .Setup(x => x.GetByIdAsync("tenant-1"))
            .ReturnsAsync(tenant);

        await middleware.InvokeAsync(
            context,
            _tenantContextMock.Object,
            _tenantServiceMock.Object,
            _tenantUserServiceMock.Object,
            _loggerMock.Object);

        nextCalled.Should().BeTrue();
        context.Items["TenantId"].Should().Be("tenant-1");
        context.Items["TenantPlan"].Should().Be("pro");
        context.Items["Auth0UserId"].Should().Be("auth0|abc");
        context.Items["Role"].Should().Be("admin");
        _tenantContextMock.Verify(x => x.SetTenant("tenant-1", It.IsAny<string?>()), Times.Once);
    }

    [Fact]
    public async Task InvokeAsync_Returns403_WhenTenantMissing()
    {
        var nextCalled = false;
        RequestDelegate next = _ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        };

        var middleware = new TenantResolverMiddleware(next);
        var context = NewHttpContextWithAuth0Sub("auth0|abc");

        _tenantUserServiceMock
            .Setup(x => x.GetByAuth0UserIdAsync("auth0|abc"))
            .ReturnsAsync(new TenantUser { TenantId = "tenant-404", Role = "admin" });
        _tenantServiceMock
            .Setup(x => x.GetByIdAsync("tenant-404"))
            .ReturnsAsync((Tenant?)null);

        await middleware.InvokeAsync(
            context,
            _tenantContextMock.Object,
            _tenantServiceMock.Object,
            _tenantUserServiceMock.Object,
            _loggerMock.Object);

        nextCalled.Should().BeFalse();
        context.Response.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task InvokeAsync_PassesThrough_WhenNoAuth0Claim()
    {
        var nextCalled = false;
        RequestDelegate next = _ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        };

        var middleware = new TenantResolverMiddleware(next);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(
            context,
            _tenantContextMock.Object,
            _tenantServiceMock.Object,
            _tenantUserServiceMock.Object,
            _loggerMock.Object);

        nextCalled.Should().BeTrue();
        context.Items.Should().NotContainKey("TenantId");
    }

    [Fact]
    public async Task InvokeAsync_DoesNotSetTenant_ForUnregisteredUser()
    {
        var nextCalled = false;
        RequestDelegate next = _ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        };

        var middleware = new TenantResolverMiddleware(next);
        var context = NewHttpContextWithAuth0Sub("auth0|missing");

        _tenantUserServiceMock
            .Setup(x => x.GetByAuth0UserIdAsync("auth0|missing"))
            .ReturnsAsync((TenantUser?)null);

        await middleware.InvokeAsync(
            context,
            _tenantContextMock.Object,
            _tenantServiceMock.Object,
            _tenantUserServiceMock.Object,
            _loggerMock.Object);

        nextCalled.Should().BeTrue();
        context.Items.Should().NotContainKey("TenantId");
        _tenantContextMock.Verify(x => x.SetTenant(It.IsAny<string>(), It.IsAny<string?>()), Times.Never);
    }

    private static DefaultHttpContext NewHttpContextWithAuth0Sub(string sub)
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, sub)
        };

        context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
        return context;
    }
}
