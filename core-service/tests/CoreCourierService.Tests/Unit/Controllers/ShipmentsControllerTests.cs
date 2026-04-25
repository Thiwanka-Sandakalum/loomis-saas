using CoreCourierService.Api.Controllers;
using CoreCourierService.Api.DTOs;
using CoreCourierService.Core.Entities;
using CoreCourierService.Api.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace CoreCourierService.Tests;

public class ShipmentsControllerTests
{
    private readonly Mock<IShipmentService> _shipmentServiceMock = new();
    private readonly Mock<IShipmentEventService> _eventServiceMock = new();
    private readonly Mock<ILogger<ShipmentsController>> _loggerMock = new();

    private ShipmentsController CreateController()
        => new(_shipmentServiceMock.Object, _eventServiceMock.Object, _loggerMock.Object);

    [Fact]
    public async Task CreateShipment_Returns201_WithTrackingNumber()
    {
        var controller = CreateController();
        var request = NewCreateShipmentRequest();
        var createdShipment = NewShipment("LMS-12345");

        _shipmentServiceMock
            .Setup(x => x.CreateShipmentAsync(It.IsAny<Shipment>()))
            .ReturnsAsync(createdShipment);

        var result = await controller.CreateShipment(request);

        result.Result.Should().BeOfType<CreatedAtActionResult>();
        var createdAt = (CreatedAtActionResult)result.Result!;
        var response = createdAt.Value.Should().BeOfType<ShipmentResponse>().Subject;
        response.TrackingNumber.Should().Be("LMS-12345");
    }

    [Fact]
    public async Task GetByTrackingNumber_Returns404_WhenMissing()
    {
        var controller = CreateController();

        _shipmentServiceMock
            .Setup(x => x.GetByTrackingNumberAsync("LMS-404"))
            .ReturnsAsync((Shipment?)null);

        var result = await controller.GetByTrackingNumber("LMS-404");

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetByTrackingNumber_Returns200_WhenFound()
    {
        var controller = CreateController();

        _shipmentServiceMock
            .Setup(x => x.GetByTrackingNumberAsync("LMS-200"))
            .ReturnsAsync(NewShipment("LMS-200"));

        var result = await controller.GetByTrackingNumber("LMS-200");

        result.Result.Should().BeOfType<OkObjectResult>();
        var ok = (OkObjectResult)result.Result!;
        ok.Value.Should().BeOfType<ShipmentResponse>();
    }

    [Fact]
    public async Task UpdateStatus_Returns404_WhenShipmentMissing()
    {
        var controller = CreateController();

        _shipmentServiceMock
            .Setup(x => x.UpdateStatusAsync("LMS-X", "InTransit", "Colombo"))
            .ReturnsAsync((Shipment?)null);

        var result = await controller.UpdateStatus("LMS-X", new UpdateStatusRequest("InTransit", "Colombo"));

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetShipments_ReturnsPagedResponse()
    {
        var controller = CreateController();

        _shipmentServiceMock
            .Setup(x => x.GetShipmentsAsync(1, 20, null))
            .ReturnsAsync((new List<Shipment> { NewShipment("LMS-1"), NewShipment("LMS-2") }, 2));

        var result = await controller.GetShipments();

        result.Result.Should().BeOfType<OkObjectResult>();
        var ok = (OkObjectResult)result.Result!;
        var payload = ok.Value.Should().BeOfType<PagedResponse<ShipmentResponse>>().Subject;
        payload.Data.Should().HaveCount(2);
        payload.Pagination.TotalItems.Should().Be(2);
    }

    private static CreateShipmentRequest NewCreateShipmentRequest()
        => new(
            new ContactInfo
            {
                Name = "Sender",
                Address = "Addr1",
                City = "Colombo",
                Country = "LK",
                Phone = "+94770000000"
            },
            new ContactInfo
            {
                Name = "Receiver",
                Address = "Addr2",
                City = "Kandy",
                Country = "LK",
                Phone = "+94771111111"
            },
            new ParcelInfo { Weight = 2.5m, Description = "Docs" },
            "Express");

    private static Shipment NewShipment(string tracking)
        => new()
        {
            Id = Guid.NewGuid().ToString("N"),
            TrackingNumber = tracking,
            Sender = new ContactInfo { Name = "S", Address = "A", Country = "LK", Phone = "+9477" },
            Receiver = new ContactInfo { Name = "R", Address = "B", Country = "LK", Phone = "+9478" },
            Parcel = new ParcelInfo { Weight = 1.5m },
            ServiceType = "Express",
            Status = "Created",
            CreatedAt = DateTime.UtcNow
        };
}
