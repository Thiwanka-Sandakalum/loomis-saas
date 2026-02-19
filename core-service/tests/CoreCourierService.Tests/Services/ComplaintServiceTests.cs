using CoreCourierService.Api.Services;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using FluentAssertions;
using MongoDB.Bson;
using Moq;

namespace CoreCourierService.Tests.Services;

public class ComplaintServiceTests
{
    private readonly Mock<IComplaintRepository> _mockComplaintRepo;
    private readonly Mock<ITenantContext> _mockTenantContext;
    private readonly ComplaintService _sut;

    public ComplaintServiceTests()
    {
        _mockComplaintRepo = new Mock<IComplaintRepository>();
        _mockTenantContext = new Mock<ITenantContext>();
        _mockTenantContext.Setup(x => x.TenantId).Returns(ObjectId.GenerateNewId());
        _sut = new ComplaintService(_mockComplaintRepo.Object, _mockTenantContext.Object);
    }

    [Theory]
    [InlineData("My package is delayed by 3 days", "Delay")]
    [InlineData("The shipment has been delayed significantly", "Delay")]
    [InlineData("Package arrived damaged", "Damage")]
    [InlineData("Damaged box upon delivery", "Damage")]
    [InlineData("My parcel is lost", "Lost")]
    [InlineData("Cannot find my shipment", "Lost")]
    [InlineData("Customer service issue", "Other")]
    public async Task CreateComplaintAsync_AutoDetectsType(string description, string expectedType)
    {
        // Arrange
        var complaint = new Complaint
        {
            TrackingNumber = "LMS-ABC123",
            Description = description,
            CustomerEmail = "test@example.com"
        };
        _mockComplaintRepo.Setup(x => x.CreateAsync(It.IsAny<Complaint>()))
            .ReturnsAsync((Complaint c) => c);

        // Act
        var result = await _sut.CreateComplaintAsync(complaint);

        // Assert
        result.Should().NotBeNull();
        result!.Type.Should().Be(expectedType);
        result.Status.Should().Be("Open");
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(2));
    }

    [Fact]
    public async Task CreateComplaintAsync_WithExplicitType_UsesProvidedType()
    {
        // Arrange
        var complaint = new Complaint
        {
            TrackingNumber = "LMS-ABC123",
            Description = "Issue with delivery",
            Type = "Damage", // Explicitly set
            CustomerEmail = "test@example.com"
        };
        _mockComplaintRepo.Setup(x => x.CreateAsync(It.IsAny<Complaint>()))
            .ReturnsAsync((Complaint c) => c);

        // Act
        var result = await _sut.CreateComplaintAsync(complaint);

        // Assert
        result.Should().NotBeNull();
        result!.Type.Should().Be("Damage");
    }

    [Fact]
    public async Task GetComplaintsByStatusAsync_ReturnsMatchingComplaints()
    {
        // Arrange
        var complaints = new List<Complaint>
        {
            new() { TrackingNumber = "LMS-001", Status = "Open", Type = "Delay" },
            new() { TrackingNumber = "LMS-002", Status = "Open", Type = "Damage" }
        };
        _mockComplaintRepo.Setup(x => x.GetByStatusAsync("Open"))
            .ReturnsAsync(complaints);

        // Act
        var result = await _sut.GetComplaintsByStatusAsync("Open");

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(c => c.Status.Should().Be("Open"));
    }

    [Fact]
    public async Task GetComplaintsByTypeAsync_ReturnsMatchingComplaints()
    {
        // Arrange
        var complaints = new List<Complaint>
        {
            new() { TrackingNumber = "LMS-001", Type = "Delay", Status = "Open" },
            new() { TrackingNumber = "LMS-002", Type = "Delay", Status = "InProgress" }
        };
        _mockComplaintRepo.Setup(x => x.GetByTypeAsync("Delay"))
            .ReturnsAsync(complaints);

        // Act
        var result = await _sut.GetComplaintsByTypeAsync("Delay");

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(c => c.Type.Should().Be("Delay"));
    }

    [Fact]
    public async Task GetComplaintsByTrackingNumberAsync_ReturnsAssociatedComplaints()
    {
        // Arrange
        var trackingNumber = "LMS-ABC123";
        var complaints = new List<Complaint>
        {
            new() { TrackingNumber = trackingNumber, Type = "Delay" },
            new() { TrackingNumber = trackingNumber, Type = "Damage" }
        };
        _mockComplaintRepo.Setup(x => x.GetByTrackingNumberAsync(trackingNumber))
            .ReturnsAsync(complaints);

        // Act
        var result = await _sut.GetComplaintsByTrackingNumberAsync(trackingNumber);

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(c => c.TrackingNumber.Should().Be(trackingNumber));
    }

    [Fact]
    public async Task UpdateComplaintStatusAsync_ValidStatus_UpdatesSuccessfully()
    {
        // Arrange
        var complaintId = ObjectId.GenerateNewId();
        var complaint = new Complaint
        {
            Id = complaintId,
            Status = "Open"
        };
        _mockComplaintRepo.Setup(x => x.GetByIdAsync(complaintId))
            .ReturnsAsync(complaint);
        _mockComplaintRepo.Setup(x => x.UpdateAsync(It.IsAny<Complaint>()))
            .ReturnsAsync((Complaint c) => c);

        // Act
        var result = await _sut.UpdateComplaintStatusAsync(complaintId, "Resolved", "Issue fixed");

        // Assert
        result.Should().NotBeNull();
        result!.Status.Should().Be("Resolved");
        result.Resolution.Should().Be("Issue fixed");
        result.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(2));
    }

    [Fact]
    public async Task CreateComplaintAsync_CaseInsensitiveKeywordDetection_Works()
    {
        // Arrange
        var complaint = new Complaint
        {
            TrackingNumber = "LMS-ABC123",
            Description = "MY PACKAGE IS DELAYED", // Uppercase
            CustomerEmail = "test@example.com"
        };
        _mockComplaintRepo.Setup(x => x.CreateAsync(It.IsAny<Complaint>()))
            .ReturnsAsync((Complaint c) => c);

        // Act
        var result = await _sut.CreateComplaintAsync(complaint);

        // Assert
        result.Should().NotBeNull();
        result!.Type.Should().Be("Delay"); // Should still detect despite uppercase
    }
}
