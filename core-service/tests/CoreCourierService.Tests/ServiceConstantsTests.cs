using CoreCourierService.Core;
using FluentAssertions;

namespace CoreCourierService.Tests;

/// <summary>
/// Tests for Service Constants Fix
/// Verifies that service type constants are properly defined and delivery day mappings are correct
/// </summary>
public class ServiceConstantsTests
{
    [Fact]
    public void ServiceTypes_StandardConstantExists()
    {
        // Assert
        ServiceConstants.ServiceTypes.Standard.Should().Be("Standard");
    }

    [Fact]
    public void ServiceTypes_ExpressConstantExists()
    {
        // Assert
        ServiceConstants.ServiceTypes.Express.Should().Be("Express");
    }

    [Fact]
    public void ServiceTypes_OvernightConstantExists()
    {
        // Assert
        ServiceConstants.ServiceTypes.Overnight.Should().Be("Overnight");
    }

    [Fact]
    public void ServiceTypes_AllArrayContainsAllTypes()
    {
        // Assert
        ServiceConstants.ServiceTypes.All
            .Should()
            .Contain(new[]
            {
                ServiceConstants.ServiceTypes.Standard,
                ServiceConstants.ServiceTypes.Express,
                ServiceConstants.ServiceTypes.Overnight
            });
    }

    [Theory]
    [InlineData("Standard", 5)]
    [InlineData("Express", 2)]
    [InlineData("Overnight", 1)]
    public void DeliveryDays_GetDays_ReturnsCorrectDays(string serviceType, int expectedDays)
    {
        // Act
        var days = ServiceConstants.DeliveryDays.GetDays(serviceType);

        // Assert
        days.Should().Be(expectedDays);
    }

    [Fact]
    public void DeliveryDays_GetDays_StandardReturns5()
    {
        // Act
        var days = ServiceConstants.DeliveryDays.GetDays("Standard");

        // Assert
        days.Should().Be(5);
    }

    [Fact]
    public void DeliveryDays_GetDays_ExpressReturns2()
    {
        // Act
        var days = ServiceConstants.DeliveryDays.GetDays("Express");

        // Assert
        days.Should().Be(2);
    }

    [Fact]
    public void DeliveryDays_GetDays_OvernightReturns1()
    {
        // Act
        var days = ServiceConstants.DeliveryDays.GetDays("Overnight");

        // Assert
        days.Should().Be(1);
    }

    [Fact]
    public void DeliveryDays_GetDays_UnknownServiceTypeDefaultsToStandard()
    {
        // Act
        var days = ServiceConstants.DeliveryDays.GetDays("UnknownType");

        // Assert
        days.Should().Be(5, "unknown service types should default to Standard (5 days)");
    }

    [Fact]
    public void DeliveryDays_GetDays_EmptyStringDefaultsToStandard()
    {
        // Act
        var days = ServiceConstants.DeliveryDays.GetDays("");

        // Assert
        days.Should().Be(5);
    }

    [Fact]
    public void DeliveryDays_GetDays_NullDefaultsToStandard()
    {
        // Act
        var days = ServiceConstants.DeliveryDays.GetDays(null);

        // Assert
        days.Should().Be(5);
    }

    [Fact]
    public void DeliveryDays_GetDays_CaseInsensitive()
    {
        // Act
        var daysLower = ServiceConstants.DeliveryDays.GetDays("standard");
        var daysUpper = ServiceConstants.DeliveryDays.GetDays("STANDARD");
        var daysMixed = ServiceConstants.DeliveryDays.GetDays("StAnDaRd");

        // Assert
        daysLower.Should().Be(5);
        daysUpper.Should().Be(5);
        daysMixed.Should().Be(5);
    }
}
