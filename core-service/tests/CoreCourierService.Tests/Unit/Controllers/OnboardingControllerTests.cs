using System.Security.Claims;
using CoreCourierService.Api.Controllers;
using CoreCourierService.Api.Services;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace CoreCourierService.Tests;

public class OnboardingControllerTests
{
    private readonly Mock<ITenantService> _tenantServiceMock = new();
    private readonly Mock<ITenantUserService> _tenantUserServiceMock = new();
    private readonly Mock<IRateService> _rateServiceMock = new();
    private readonly Mock<ITenantContext> _tenantContextMock = new();
    private readonly Mock<ILogger<OnboardingController>> _loggerMock = new();

    private OnboardingController CreateController(ClaimsPrincipal? user = null)
    {
        var controller = new OnboardingController(
            _tenantServiceMock.Object,
            _tenantUserServiceMock.Object,
            _rateServiceMock.Object,
            _tenantContextMock.Object,
            _loggerMock.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        if (user != null)
        {
            controller.ControllerContext.HttpContext.User = user;
        }

        return controller;
    }

    [Fact]
    public async Task SetupTenant_Returns400_WhenCompanyNameBlank()
    {
        var controller = CreateController();

        var result = await controller.SetupTenant(new SetupTenantRequest("", "free", new List<string> { "Standard" }));

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task SetupTenant_ReturnsUnauthorized_WhenNotAuthenticated()
    {
        var anonymous = new ClaimsPrincipal(new ClaimsIdentity());
        var controller = CreateController(anonymous);

        var result = await controller.SetupTenant(new SetupTenantRequest("Acme", "free", new List<string> { "Standard" }));

        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Fact]
    public async Task AcceptInvitation_Returns400_WhenTokenMissing()
    {
        var controller = CreateController();

        var result = await controller.AcceptInvitation(new AcceptInviteRequest(""));

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task AcceptInvitation_Returns404_WhenNoPendingInvite()
    {
        var user = AuthenticatedUser("auth0|u1", "u1@example.com");
        var controller = CreateController(user);

        _tenantUserServiceMock
            .Setup(x => x.GetByAuth0UserIdAsync("auth0|u1"))
            .ReturnsAsync((TenantUser?)null);
        _tenantUserServiceMock
            .Setup(x => x.AcceptInvitationAsync("auth0|u1", "u1@example.com", "token-1"))
            .ReturnsAsync((TenantUser?)null);

        var result = await controller.AcceptInvitation(new AcceptInviteRequest("token-1"));

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetOnboardingStatus_ReturnsUnauthorized_WhenNotAuthenticated()
    {
        var anonymous = new ClaimsPrincipal(new ClaimsIdentity());
        var controller = CreateController(anonymous);

        var result = await controller.GetOnboardingStatus();

        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    private static ClaimsPrincipal AuthenticatedUser(string sub, string email)
    {
        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, sub),
            new Claim("email", email)
        }, "TestAuth");

        return new ClaimsPrincipal(identity);
    }
}
