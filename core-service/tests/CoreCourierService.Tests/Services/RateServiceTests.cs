using CoreCourierService.Api.Services;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using FluentAssertions;
using MongoDB.Bson;
using Moq;

namespace CoreCourierService.Tests.Services;

public class RateServiceTests
{
    private readonly Mock<IRateRepository> _mockRateRepo;
    private readonly Mock<ITenantContext> _mockTenantContext;
    private readonly RateService _sut;

    public RateServiceTests()
    {
        _mockRateRepo = new Mock<IRateRepository>();
        _mockTenantContext = new Mock<ITenantContext>();
        _mockTenantContext.Setup(x => x.TenantId).Returns(ObjectId.GenerateNewId());
        _sut = new RateService(_mockRateRepo.Object, _mockTenantContext.Object);
    }

    [Fact]
    public async Task CalculateRate_StandardService_5Kg_ReturnsCorrectCost()
    {
        // Arrange
        var rate = new Rate
        {
            ServiceType = "Standard",
            BaseRate = 10m,
            AdditionalKgRate = 2m
        };
        _mockRateRepo.Setup(x => x.GetByServiceTypeAsync("Standard"))
            .ReturnsAsync(rate);

        // Act
        var result = await _sut.CalculateRateAsync(5.0m, "Standard");

        // Assert
        result.Should().NotBeNull();
        result!.Cost.Should().Be(18m); // 10 + (5-1)*2 = 10 + 8 = 18
        result.ServiceType.Should().Be("Standard");
        result.EstimatedDeliveryDays.Should().Be(5);
    }

    [Fact]
    public async Task CalculateRate_ExpressService_3Kg_ReturnsCorrectCost()
    {
        // Arrange
        var rate = new Rate
        {
            ServiceType = "Express",
            BaseRate = 20m,
            AdditionalKgRate = 4m
        };
        _mockRateRepo.Setup(x => x.GetByServiceTypeAsync("Express"))
            .ReturnsAsync(rate);

        // Act
        var result = await _sut.CalculateRateAsync(3.0m, "Express");

        // Assert
        result.Should().NotBeNull();
        result!.Cost.Should().Be(28m); // 20 + (3-1)*4 = 20 + 8 = 28
        result.EstimatedDeliveryDays.Should().Be(2);
    }

    [Fact]
    public async Task CalculateRate_OvernightService_1Kg_ReturnsBaseRateOnly()
    {
        // Arrange
        var rate = new Rate
        {
            ServiceType = "Overnight",
            BaseRate = 35m,
            AdditionalKgRate = 7m
        };
        _mockRateRepo.Setup(x => x.GetByServiceTypeAsync("Overnight"))
            .ReturnsAsync(rate);

        // Act
        var result = await _sut.CalculateRateAsync(1.0m, "Overnight");

        // Assert
        result.Should().NotBeNull();
        result!.Cost.Should().Be(35m); // Base rate only for 1kg
        result.EstimatedDeliveryDays.Should().Be(1);
    }

    [Fact]
    public async Task CalculateRate_ZeroWeight_ReturnsNull()
    {
        // Act
        var result = await _sut.CalculateRateAsync(0m, "Standard");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task CalculateRate_NegativeWeight_ReturnsNull()
    {
        // Act
        var result = await _sut.CalculateRateAsync(-5m, "Standard");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task CalculateRate_NoRateConfigured_ReturnsNull()
    {
        // Arrange
        _mockRateRepo.Setup(x => x.GetByServiceTypeAsync("Standard"))
            .ReturnsAsync((Rate?)null);

        // Act
        var result = await _sut.CalculateRateAsync(5m, "Standard");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task CalculateRate_FractionalWeight_RoundsCorrectly()
    {
        // Arrange
        var rate = new Rate
        {
            ServiceType = "Standard",
            BaseRate = 10m,
            AdditionalKgRate = 2.5m
        };
        _mockRateRepo.Setup(x => x.GetByServiceTypeAsync("Standard"))
            .ReturnsAsync(rate);

        // Act
        var result = await _sut.CalculateRateAsync(2.5m, "Standard");

        // Assert
        result.Should().NotBeNull();
        result!.Cost.Should().Be(13.75m); // 10 + (2.5-1)*2.5 = 10 + 3.75 = 13.75
    }

    [Fact]
    public async Task GetAllRatesAsync_ReturnsAllRates()
    {
        // Arrange
        var rates = new List<Rate>
        {
            new() { ServiceType = "Standard", BaseRate = 10m },
            new() { ServiceType = "Express", BaseRate = 20m },
            new() { ServiceType = "Overnight", BaseRate = 35m }
        };
        _mockRateRepo.Setup(x => x.GetAllAsync()).ReturnsAsync(rates);

        // Act
        var result = await _sut.GetAllRatesAsync();

        // Assert
        result.Should().HaveCount(3);
        result.Should().Contain(r => r.ServiceType == "Standard");
        result.Should().Contain(r => r.ServiceType == "Express");
    }
}
