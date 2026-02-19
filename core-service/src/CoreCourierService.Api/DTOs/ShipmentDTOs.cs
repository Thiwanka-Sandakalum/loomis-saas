using CoreCourierService.Core.Entities;

namespace CoreCourierService.Api.DTOs;

public record CreateShipmentRequest(
    ContactInfo Sender,
    ContactInfo Receiver,
    ParcelInfo Parcel,
    string ServiceType,
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
    string Status,
    string Location,
    string? Notes = null);

public record PagedResponse<T>(
    IEnumerable<T> Data,
    PaginationMeta Pagination);

public record PaginationMeta(
    int Page,
    int PageSize,
    long TotalPages,
    long TotalItems);
