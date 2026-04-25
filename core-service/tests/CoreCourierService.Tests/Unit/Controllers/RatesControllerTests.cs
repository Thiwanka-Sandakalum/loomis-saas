using CoreCourierService.Api.Controllers;
using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using CoreCourierService.Core.Entities;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace CoreCourierService.Tests;

public class RatesControllerTests
{
    private readonly Mock<IRateService> _rateServiceMock = new();
    private readonly Mock<ILogger<RatesController>> _loggerMock = new();

    private RatesController CreateController() => new(_rateServiceMock.Object, _loggerMock.Object);

    [Fact]
    public async Task CreateRate_Returns201_WithCreatedRate()
    {
        var controller = CreateController();
        var request = new CreateRateRequest
        {
            ServiceType = "Express",
            BaseRate = 100,
            AdditionalKgRate = 20,
            MinWeight = 0.5m,
            MaxWeight = 30
        };

        _rateServiceMock
            .Setup(x => x.CreateRateAsync("Express", 100, 20, 0.5m, 30))
            .ReturnsAsync(new Rate { Id = "rate-1", ServiceType = "Express" });

        var result = await controller.CreateRate(request);

        result.Should().BeOfType<CreatedAtActionResult>();
    }

    [Fact]
    public async Task GetRate_Returns404_WhenMissing()
    {
        var controller = CreateController();
        _rateServiceMock.Setup(x => x.GetRateByIdAsync("missing")).ReturnsAsync((Rate?)null);

        var result = await controller.GetRate("missing");

        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task CalculateRate_Returns200_WhenCalculationSucceeds()
    {
        var controller = CreateController();
        var request = new CalculateRateRequest { ServiceType = "Standard", Weight = 2m };

        _rateServiceMock
            .Setup(x => x.CalculateRateAsync("Standard", 2m))
            .ReturnsAsync((150m, 100m, 50m, "2026-04-29"));

        var result = await controller.CalculateRate(request);

        result.Should().BeOfType<OkObjectResult>();
        var response = ((OkObjectResult)result).Value.Should().BeOfType<RateCalculationResponse>().Subject;
        response.Total.Should().Be(150m);
    }

    [Fact]
    public async Task CalculateRate_Returns400_WhenServiceThrows()
    {
        var controller = CreateController();
        var request = new CalculateRateRequest { ServiceType = "Standard", Weight = 2m };

        _rateServiceMock
            .Setup(x => x.CalculateRateAsync("Standard", 2m))
            .ThrowsAsync(new Exception("boom"));

        var result = await controller.CalculateRate(request);

        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task DeleteRate_Returns204_WhenDeleted()
    {
        var controller = CreateController();
        _rateServiceMock.Setup(x => x.DeleteRateAsync("rate-1")).ReturnsAsync(true);

        var result = await controller.DeleteRate("rate-1");

        result.Should().BeOfType<NoContentResult>();
    }
}
