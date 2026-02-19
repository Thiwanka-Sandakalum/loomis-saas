using System.Net;
using System.Net.Http.Json;
using CoreCourierService.Api.DTOs;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;

namespace CoreCourierService.Tests.Integration;

public class RatesControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public RatesControllerIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact(Skip = "Integration test - requires MongoDB")]
    public async Task CalculateRate_ValidRequest_ReturnsCorrectCost()
    {
        // Arrange
        var request = new CalculateRateRequest
        {
            Weight = 5.5m,
            ServiceType = "Standard"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/rates/calculate", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<RateCalculationResponse>();
        result.Should().NotBeNull();
        result!.ServiceType.Should().Be("Standard");
        result.Cost.Should().BeGreaterThan(0);
    }

    [Fact(Skip = "Integration test - requires MongoDB")]
    public async Task CalculateRate_NegativeWeight_ReturnsBadRequest()
    {
        // Arrange
        var request = new CalculateRateRequest
        {
            Weight = -1,
            ServiceType = "Standard"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/rates/calculate", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}

public class CalculateRateRequest
{
    public decimal Weight { get; set; }
    public string ServiceType { get; set; } = string.Empty;
}

public class RateCalculationResponse
{
    public string ServiceType { get; set; } = string.Empty;
    public decimal Cost { get; set; }
    public string EstimatedDelivery { get; set; } = string.Empty;
}
