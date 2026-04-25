using CoreCourierService.Api.Middleware;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;

namespace CoreCourierService.Tests;

public class RateLimitingMiddlewareTests
{
    private readonly Mock<ILogger<RateLimitingMiddleware>> _loggerMock = new();

    [Fact]
    public async Task InvokeAsync_AllowsRequestsBelowLimit()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var nextCalled = false;

        RequestDelegate next = ctx =>
        {
            nextCalled = true;
            ctx.Response.StatusCode = 200;
            return Task.CompletedTask;
        };

        var middleware = new RateLimitingMiddleware(next, cache, _loggerMock.Object);
        var context = NewContext("/api/rates", "tenant-1", "free");

        await middleware.InvokeAsync(context);

        nextCalled.Should().BeTrue();
        context.Response.StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task InvokeAsync_Returns429_WhenExceedingFreePlanLimit()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());

        RequestDelegate next = ctx =>
        {
            ctx.Response.StatusCode = 200;
            return Task.CompletedTask;
        };

        var middleware = new RateLimitingMiddleware(next, cache, _loggerMock.Object);

        for (var i = 0; i < 60; i++)
        {
            var context = NewContext("/api/rates", "tenant-1", "free");
            await middleware.InvokeAsync(context);
        }

        var throttledContext = NewContext("/api/rates", "tenant-1", "free");
        await middleware.InvokeAsync(throttledContext);

        throttledContext.Response.StatusCode.Should().Be(429);
    }

    [Fact]
    public async Task InvokeAsync_SkipsRateLimiting_WhenNoTenantId()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var nextCalled = false;

        RequestDelegate next = _ =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        };

        var middleware = new RateLimitingMiddleware(next, cache, _loggerMock.Object);
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/rates";

        await middleware.InvokeAsync(context);

        nextCalled.Should().BeTrue();
    }

    [Fact]
    public async Task InvokeAsync_AddsRateLimitHeaders()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());

        RequestDelegate next = ctx =>
        {
            ctx.Response.StatusCode = 200;
            return Task.CompletedTask;
        };

        var middleware = new RateLimitingMiddleware(next, cache, _loggerMock.Object);
        var context = NewContext("/api/rates", "tenant-1", "free");

        await middleware.InvokeAsync(context);

        context.Response.Headers.Should().ContainKey("X-RateLimit-Limit");
        context.Response.Headers.Should().ContainKey("X-RateLimit-Remaining");
        context.Response.Headers.Should().ContainKey("X-RateLimit-Reset");
    }

    [Fact]
    public async Task InvokeAsync_UsesPlanSpecificLimit_ForProPlan()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());

        RequestDelegate next = ctx =>
        {
            ctx.Response.StatusCode = 200;
            return Task.CompletedTask;
        };

        var middleware = new RateLimitingMiddleware(next, cache, _loggerMock.Object);

        for (var i = 0; i < 61; i++)
        {
            var context = NewContext("/api/rates", "tenant-pro", "pro");
            await middleware.InvokeAsync(context);
            context.Response.StatusCode.Should().NotBe(429);
        }
    }

    private static DefaultHttpContext NewContext(string path, string tenantId, string plan)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Items["TenantId"] = tenantId;
        context.Items["TenantPlan"] = plan;
        context.Response.Body = new MemoryStream();
        return context;
    }
}
