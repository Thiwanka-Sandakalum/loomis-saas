using CoreCourierService.Infrastructure.Configuration;
using FluentAssertions;
using MongoDB.Bson;
using Moq;

namespace CoreCourierService.Tests.Middleware;

public class TenantContextTests
{
    [Fact]
    public void TenantContext_ShouldStoreTenantId()
    {
        // Arrange
        var expectedTenantId = ObjectId.GenerateNewId();
        var context = new TenantContext { TenantId = expectedTenantId };

        // Act & Assert
        context.TenantId.Should().Be(expectedTenantId);
    }

    [Fact]
    public void TenantContext_DefaultValue_ShouldBeEmpty()
    {
        // Arrange & Act
        var context = new TenantContext();

        // Assert
        context.TenantId.Should().Be(ObjectId.Empty);
    }
}
