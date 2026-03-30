using CoreCourierService.Core.Entities;
using System.ComponentModel.DataAnnotations;

namespace CoreCourierService.Api.DTOs;

public record CreateShipmentRequest(
    [Required] ContactInfo Sender,
    [Required] ContactInfo Receiver,
    [Required] ParcelInfo Parcel,
    [Required][StringLength(20, MinimumLength = 3)] string ServiceType,
    string? SpecialInstructions = null);

public record ShipmentResponse(
    string Id,
    string TrackingNumber,
    ContactInfo Sender,
    ContactInfo Receiver,
    ParcelInfo Parcel,
    string ServiceType,
    string Status,
    DateTime? EstimatedDelivery,
    DateTime CreatedAt);

public record UpdateStatusRequest(
    [Required][StringLength(30, MinimumLength = 2)] string Status,
    [Required][StringLength(200, MinimumLength = 2)] string Location,
    string? Notes = null);

public record PagedResponse<T>(
    IEnumerable<T> Data,
    PaginationMeta Pagination);

public record PaginationMeta(
    int Page,
    int PageSize,
    long TotalPages,
    long TotalItems);
