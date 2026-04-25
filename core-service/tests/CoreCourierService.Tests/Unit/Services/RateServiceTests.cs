using CoreCourierService.Api.Middleware;
using CoreCourierService.Api.Services;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using FluentAssertions;
using Moq;

namespace CoreCourierService.Tests;

public class RateServiceTests
{
    private readonly Mock<IRateRepository> _rateRepositoryMock = new();
    private readonly Mock<ITenantContext> _tenantContextMock = new();
    private readonly Mock<ICacheService> _cacheMock = new();

    private readonly RateService _sut;

    public RateServiceTests()
    {
        _tenantContextMock.SetupGet(x => x.TenantId).Returns("tenant-1");
        _sut = new RateService(_rateRepositoryMock.Object, _tenantContextMock.Object, _cacheMock.Object);
    }

    [Fact]
    public async Task CreateRateAsync_StoresCanonicalServiceType()
    {
        Rate? captured = null;
        _rateRepositoryMock
            .Setup(x => x.CreateAsync(It.IsAny<Rate>()))
            .Callback<Rate>(rate => captured = rate)
            .ReturnsAsync((Rate rate) => rate);

        await _sut.CreateRateAsync("express", 100m, 20m, 0.5m, 30m);

        captured.Should().NotBeNull();
        captured!.ServiceType.Should().Be("Express");
    }

    [Fact]
    public async Task CalculateRateAsync_BaseRateOnly_ForWeightOne()
    {
        var cachedRate = new Rate
        {
            ServiceType = "Standard",
            BaseRate = 120m,
            AdditionalKgRate = 25m
        };

        _cacheMock.Setup(x => x.Get<Rate>(It.IsAny<string>())).Returns(cachedRate);

        var result = await _sut.CalculateRateAsync("standard", 1m);

        result.total.Should().Be(120m);
        result.baseRate.Should().Be(120m);
        result.additionalCharges.Should().Be(0m);
    }

    [Fact]
    public async Task CalculateRateAsync_AdditionalCharges_ForWeightOverOne()
    {
        var cachedRate = new Rate
        {
            ServiceType = "Express",
            BaseRate = 100m,
            AdditionalKgRate = 15m
        };

        _cacheMock.Setup(x => x.Get<Rate>(It.IsAny<string>())).Returns(cachedRate);

        var result = await _sut.CalculateRateAsync("Express", 3m);

        result.baseRate.Should().Be(100m);
        result.additionalCharges.Should().Be(30m);
        result.total.Should().Be(130m);
    }

    [Fact]
    public async Task CalculateRateAsync_ReturnsFromCache_WhenCached()
    {
        var cachedRate = new Rate
        {
            ServiceType = "Overnight",
            BaseRate = 200m,
            AdditionalKgRate = 40m
        };

        _cacheMock
            .Setup(x => x.Get<Rate>("tenant_rates_tenant-1_Overnight"))
            .Returns(cachedRate);

        await _sut.CalculateRateAsync("overnight", 2m);

        _rateRepositoryMock.Verify(x => x.GetByServiceTypeAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task CalculateRateAsync_ThrowsNotFoundException_WhenNoRate()
    {
        _cacheMock.Setup(x => x.Get<Rate>(It.IsAny<string>())).Returns((Rate?)null);
        _rateRepositoryMock.Setup(x => x.GetByServiceTypeAsync("Standard")).ReturnsAsync((Rate?)null);

        var act = async () => await _sut.CalculateRateAsync("standard", 2m);

        await act.Should().ThrowAsync<NotFoundException>()
            .WithMessage("*No rate configured*");
    }

    [Fact]
    public async Task CalculateRateAsync_EstimatedDelivery_CorrectDaysAhead()
    {
        var cachedRate = new Rate
        {
            ServiceType = "Express",
            BaseRate = 100m,
            AdditionalKgRate = 10m
        };

        _cacheMock.Setup(x => x.Get<Rate>(It.IsAny<string>())).Returns(cachedRate);

        var before = DateTime.UtcNow.Date;
        var result = await _sut.CalculateRateAsync("express", 1m);

        var parsedDate = DateTime.Parse(result.estimatedDelivery).Date;
        parsedDate.Should().Be(before.AddDays(2));
    }
}
