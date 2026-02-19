using CoreCourierService.Api.Services;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using FluentAssertions;
using MongoDB.Bson;
using Moq;

namespace CoreCourierService.Tests.Services;

public class TenantServiceTests
{
    private readonly Mock<ITenantRepository> _mockTenantRepo;
    private readonly TenantService _sut;

    public TenantServiceTests()
    {
        _mockTenantRepo = new Mock<ITenantRepository>();
        _sut = new TenantService(_mockTenantRepo.Object);
    }

    [Fact]
    public async Task CreateTenantAsync_ValidData_GeneratesApiKey()
    {
        // Arrange
        var tenant = new Tenant
        {
            Name = "Test Company",
            Plan = "pro"
        };
        _mockTenantRepo.Setup(x => x.CreateAsync(It.IsAny<Tenant>()))
            .ReturnsAsync((Tenant t) => t);

        // Act
        var result = await _sut.CreateTenantAsync(tenant);

        // Assert
        result.Should().NotBeNull();
        result!.ApiKey.Should().StartWith("cmp_live_");
        result.ApiKey.Length.Should().BeGreaterThan(20);
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(2));
    }

    [Fact]
    public async Task CreateTenantAsync_MultipleCreations_GenerateUniqueApiKeys()
    {
        // Arrange
        var apiKeys = new List<string>();
        _mockTenantRepo.Setup(x => x.CreateAsync(It.IsAny<Tenant>()))
            .ReturnsAsync((Tenant t) => t);

        // Act - Create 10 tenants
        for (int i = 0; i < 10; i++)
        {
            var tenant = new Tenant { Name = $"Company {i}", Plan = "free" };
            var result = await _sut.CreateTenantAsync(tenant);
            apiKeys.Add(result!.ApiKey);
        }

        // Assert
        apiKeys.Should().OnlyHaveUniqueItems();
        apiKeys.Should().AllSatisfy(key => key.Should().StartWith("cmp_live_"));
    }

    [Fact]
    public async Task GetTenantByApiKeyAsync_ValidKey_ReturnsTenant()
    {
        // Arrange
        var apiKey = "cmp_live_test123";
        var tenant = new Tenant
        {
            Id = ObjectId.GenerateNewId(),
            Name = "Test Company",
            ApiKey = apiKey,
            Plan = "pro"
        };
        _mockTenantRepo.Setup(x => x.GetByApiKeyAsync(apiKey))
            .ReturnsAsync(tenant);

        // Act
        var result = await _sut.GetTenantByApiKeyAsync(apiKey);

        // Assert
        result.Should().NotBeNull();
        result!.ApiKey.Should().Be(apiKey);
        result.Name.Should().Be("Test Company");
    }

    [Fact]
    public async Task GetTenantByApiKeyAsync_InvalidKey_ReturnsNull()
    {
        // Arrange
        _mockTenantRepo.Setup(x => x.GetByApiKeyAsync(It.IsAny<string>()))
            .ReturnsAsync((Tenant?)null);

        // Act
        var result = await _sut.GetTenantByApiKeyAsync("invalid_key");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetTenantByIdAsync_ExistingTenant_ReturnsTenant()
    {
        // Arrange
        var tenantId = ObjectId.GenerateNewId();
        var tenant = new Tenant
        {
            Id = tenantId,
            Name = "Test Company"
        };
        _mockTenantRepo.Setup(x => x.GetByIdAsync(tenantId))
            .ReturnsAsync(tenant);

        // Act
        var result = await _sut.GetTenantByIdAsync(tenantId);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(tenantId);
    }

    [Theory]
    [InlineData("free")]
    [InlineData("pro")]
    [InlineData("enterprise")]
    public async Task CreateTenantAsync_DifferentPlans_SetsCorrectly(string plan)
    {
        // Arrange
        var tenant = new Tenant { Name = "Test", Plan = plan };
        _mockTenantRepo.Setup(x => x.CreateAsync(It.IsAny<Tenant>()))
            .ReturnsAsync((Tenant t) => t);

        // Act
        var result = await _sut.CreateTenantAsync(tenant);

        // Assert
        result.Should().NotBeNull();
        result!.Plan.Should().Be(plan);
    }

    [Fact]
    public async Task UpdateTenantAsync_ValidData_UpdatesSuccessfully()
    {
        // Arrange
        var tenant = new Tenant
        {
            Id = ObjectId.GenerateNewId(),
            Name = "Updated Name",
            Plan = "enterprise"
        };
        _mockTenantRepo.Setup(x => x.UpdateAsync(It.IsAny<Tenant>()))
            .ReturnsAsync(tenant);

        // Act
        var result = await _sut.UpdateTenantAsync(tenant);

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("Updated Name");
        result.Plan.Should().Be("enterprise");
    }

    [Fact]
    public async Task GetAllTenantsAsync_ReturnsAllTenants()
    {
        // Arrange
        var tenants = new List<Tenant>
        {
            new() { Name = "Company A", Plan = "free" },
            new() { Name = "Company B", Plan = "pro" },
            new() { Name = "Company C", Plan = "enterprise" }
        };
        _mockTenantRepo.Setup(x => x.GetAllAsync()).ReturnsAsync(tenants);

        // Act
        var result = await _sut.GetAllTenantsAsync();

        // Assert
        result.Should().HaveCount(3);
        result.Should().Contain(t => t.Name == "Company A");
        result.Should().Contain(t => t.Plan == "enterprise");
    }
}
