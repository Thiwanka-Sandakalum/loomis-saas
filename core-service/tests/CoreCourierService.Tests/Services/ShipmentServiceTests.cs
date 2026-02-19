using CoreCourierService.Api.Services;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using FluentAssertions;
using MongoDB.Bson;
using Moq;

namespace CoreCourierService.Tests.Services;

public class ShipmentServiceTests
{
    private readonly Mock<IShipmentRepository> _mockShipmentRepo;
    private readonly Mock<ITenantContext> _mockTenantContext;
    private readonly ShipmentService _sut;

    public ShipmentServiceTests()
    {
        _mockShipmentRepo = new Mock<IShipmentRepository>();
        _mockTenantContext = new Mock<ITenantContext>();
        _mockTenantContext.Setup(x => x.TenantId).Returns(ObjectId.GenerateNewId());
        _sut = new ShipmentService(_mockShipmentRepo.Object, _mockTenantContext.Object);
    }

    [Fact]
    public async Task CreateShipmentAsync_ValidData_GeneratesTrackingNumber()
    {
        // Arrange
        var shipment = new Shipment
        {
            Sender = new ContactInfo { Name = "John Doe", Address = "123 Main St", Country = "Sri Lanka", Phone = "+94771234567" },
            Receiver = new ContactInfo { Name = "Jane Doe", Address = "456 Oak St", Country = "Sri Lanka", Phone = "+94779876543" },
            Parcel = new ParcelInfo { Weight = 2.5m },
            ServiceType = "Standard"
        };

        _mockShipmentRepo.Setup(x => x.CreateAsync(It.IsAny<Shipment>()))
            .ReturnsAsync((Shipment s) => s);

        // Act
        var result = await _sut.CreateShipmentAsync(shipment);

        // Assert
        result.Should().NotBeNull();
        result!.TrackingNumber.Should().StartWith("LMS-");
        result.TrackingNumber.Length.Should().Be(12); // "LMS-" + 8 characters
        result.Status.Should().Be("Created");
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(2));
    }

    [Fact]
    public async Task CreateShipmentAsync_MultipleShipments_GenerateUniqueTrackingNumbers()
    {
        // Arrange
        var shipments = new List<string>();
        _mockShipmentRepo.Setup(x => x.CreateAsync(It.IsAny<Shipment>()))
            .ReturnsAsync((Shipment s) => s);

        // Act - Create 10 shipments
        for (int i = 0; i < 10; i++)
        {
            var shipment = new Shipment
            {
                Sender = new ContactInfo { Name = "John", Address = "123 St", Country = "LK", Phone = "123" },
                Receiver = new ContactInfo { Name = "Jane", Address = "456 St", Country = "LK", Phone = "456" },
                Parcel = new ParcelInfo { Weight = 1 },
                ServiceType = "Standard"
            };
            var result = await _sut.CreateShipmentAsync(shipment);
            shipments.Add(result!.TrackingNumber);
        }

        // Assert
        shipments.Should().OnlyHaveUniqueItems();
        shipments.Should().AllSatisfy(tn => tn.Should().StartWith("LMS-"));
    }

    [Fact]
    public async Task GetShipmentByTrackingNumberAsync_ExistingTracking_ReturnsShipment()
    {
        // Arrange
        var trackingNumber = "LMS-ABC12345";
        var shipment = new Shipment
        {
            Id = ObjectId.GenerateNewId(),
            TrackingNumber = trackingNumber,
            Status = "InTransit"
        };
        _mockShipmentRepo.Setup(x => x.GetByTrackingNumberAsync(trackingNumber))
            .ReturnsAsync(shipment);

        // Act
        var result = await _sut.GetShipmentByTrackingNumberAsync(trackingNumber);

        // Assert
        result.Should().NotBeNull();
        result!.TrackingNumber.Should().Be(trackingNumber);
        result.Status.Should().Be("InTransit");
    }

    [Fact]
    public async Task GetShipmentByTrackingNumberAsync_NonExistingTracking_ReturnsNull()
    {
        // Arrange
        _mockShipmentRepo.Setup(x => x.GetByTrackingNumberAsync(It.IsAny<string>()))
            .ReturnsAsync((Shipment?)null);

        // Act
        var result = await _sut.GetShipmentByTrackingNumberAsync("LMS-NOTFOUND");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task UpdateShipmentStatusAsync_ValidStatus_UpdatesSuccessfully()
    {
        // Arrange
        var trackingNumber = "LMS-ABC12345";
        var shipment = new Shipment
        {
            Id = ObjectId.GenerateNewId(),
            TrackingNumber = trackingNumber,
            Status = "Created"
        };
        _mockShipmentRepo.Setup(x => x.GetByTrackingNumberAsync(trackingNumber))
            .ReturnsAsync(shipment);
        _mockShipmentRepo.Setup(x => x.UpdateAsync(It.IsAny<Shipment>()))
            .ReturnsAsync((Shipment s) => s);

        // Act
        var result = await _sut.UpdateShipmentStatusAsync(trackingNumber, "PickedUp");

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be("PickedUp");
        result.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(2));
    }

    [Fact]
    public async Task GetShipmentsByStatusAsync_ReturnsMatchingShipments()
    {
        // Arrange
        var shipments = new List<Shipment>
        {
            new() { TrackingNumber = "LMS-001", Status = "InTransit" },
            new() { TrackingNumber = "LMS-002", Status = "InTransit" }
        };
        _mockShipmentRepo.Setup(x => x.GetByStatusAsync("InTransit"))
            .ReturnsAsync(shipments);

        // Act
        var result = await _sut.GetShipmentsByStatusAsync("InTransit");

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(s => s.Status.Should().Be("InTransit"));
    }

    [Theory]
    [InlineData("Standard")]
    [InlineData("Express")]
    [InlineData("Overnight")]
    public async Task CreateShipmentAsync_DifferentServiceTypes_SetsCorrectly(string serviceType)
    {
        // Arrange
        var shipment = new Shipment
        {
            Sender = new ContactInfo { Name = "John", Address = "123", Country = "LK", Phone = "123" },
            Receiver = new ContactInfo { Name = "Jane", Address = "456", Country = "LK", Phone = "456" },
            Parcel = new ParcelInfo { Weight = 1 },
            ServiceType = serviceType
        };
        _mockShipmentRepo.Setup(x => x.CreateAsync(It.IsAny<Shipment>()))
            .ReturnsAsync((Shipment s) => s);

        // Act
        var result = await _sut.CreateShipmentAsync(shipment);

        // Assert
        result.Should().NotBeNull();
        result!.ServiceType.Should().Be(serviceType);
    }
}
