namespace CoreCourierService.Api.DTOs;

// Rate DTOs
public class CreateRateRequest
{
    public string ServiceType { get; set; } = string.Empty;
    public decimal BaseRate { get; set; }
    public decimal AdditionalKgRate { get; set; }
    public decimal MinWeight { get; set; }
    public decimal MaxWeight { get; set; }
}

public class UpdateRateRequest
{
    public decimal? BaseRate { get; set; }
    public decimal? AdditionalKgRate { get; set; }
    public decimal? MinWeight { get; set; }
    public decimal? MaxWeight { get; set; }
}

public class CalculateRateRequest
{
    public decimal Weight { get; set; }
    public decimal? Length { get; set; }
    public decimal? Width { get; set; }
    public decimal? Height { get; set; }
    public string ServiceType { get; set; } = string.Empty;
}

public class RateCalculationResponse
{
    public string ServiceType { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public decimal BaseRate { get; set; }
    public decimal AdditionalCharges { get; set; }
    public decimal Total { get; set; }
    public string Currency { get; set; } = "USD";
    public string EstimatedDelivery { get; set; } = string.Empty;
}

// Payment DTOs
public class CreatePaymentRequest
{
    public string TrackingNumber { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Method { get; set; } = string.Empty;
    public string? TransactionId { get; set; }
}

public class UpdatePaymentStatusRequest
{
    public string Status { get; set; } = string.Empty;
}

// Complaint DTOs
public class CreateComplaintRequest
{
    public string TrackingNumber { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
}

public class UpdateComplaintRequest
{
    public string? Status { get; set; }
    public string? Resolution { get; set; }
    public string? AssignedTo { get; set; }
}

// Shipment Event DTOs
public class CreateEventRequest
{
    public string Status { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string? Notes { get; set; }
}
