using CoreCourierService.Api.Controllers;
using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace CoreCourierService.Tests;

public class TenantUsersControllerTests
{
    private readonly Mock<ITenantUserService> _tenantUserServiceMock = new();
    private readonly Mock<ILogger<TenantUsersController>> _loggerMock = new();

    private TenantUsersController CreateController()
    {
        var controller = new TenantUsersController(_tenantUserServiceMock.Object, _loggerMock.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        return controller;
    }

    [Fact]
    public async Task InviteUser_ReturnsUnauthorized_WhenAuth0UserMissing()
    {
        var controller = CreateController();

        var result = await controller.InviteUser(new InviteTenantUserRequest("user@example.com", "csr"));

        result.Result.Should().BeOfType<UnauthorizedObjectResult>();
    }

    [Theory]
    [InlineData("")]
    [InlineData("invalid-email")]
    public async Task InviteUser_ReturnsBadRequest_WhenEmailInvalid(string email)
    {
        var controller = CreateController();
        controller.HttpContext.Items["Auth0UserId"] = "auth0|admin";

        var result = await controller.InviteUser(new InviteTenantUserRequest(email, "csr"));

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task InviteUser_ReturnsBadRequest_WhenRoleInvalid()
    {
        var controller = CreateController();
        controller.HttpContext.Items["Auth0UserId"] = "auth0|admin";

        var result = await controller.InviteUser(new InviteTenantUserRequest("user@example.com", "super-admin"));

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Theory]
    [InlineData("")]
    [InlineData("no-at-sign")]
    public async Task ResendInvitation_ReturnsBadRequest_WhenEmailInvalid(string email)
    {
        var controller = CreateController();

        var result = await controller.ResendInvitation(new ResendInvitationRequest(email));

        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task RevokeInvitation_ReturnsNotFound_WhenServiceReturnsFalse()
    {
        var controller = CreateController();
        _tenantUserServiceMock
            .Setup(x => x.RevokeInvitationAsync("tenant-user-1"))
            .ReturnsAsync(false);

        var result = await controller.RevokeInvitation("tenant-user-1");

        result.Should().BeOfType<NotFoundObjectResult>();
    }
}
