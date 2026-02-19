using CoreCourierService.Core.Entities;

namespace CoreCourierService.Api.DTOs;

// AI Brain DTOs - Optimized for LLM consumption
public class AICreateShipmentRequest
{
    public ContactInfo Sender { get; set; } = new();
    public ContactInfo Receiver { get; set; } = new();
    public ParcelInfo Parcel { get; set; } = new();
    public string ServiceType { get; set; } = string.Empty;
    public string? ConversationId { get; set; }
}

public class AIShipmentResponse
{
    public bool Success { get; set; }
    public string TrackingNumber { get; set; } = string.Empty;
    public string EstimatedDelivery { get; set; } = string.Empty;
    public decimal Cost { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class AITrackingResponse
{
    public string TrackingNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string CurrentLocation { get; set; } = string.Empty;
    public DateTime LastUpdate { get; set; }
    public string EstimatedDelivery { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
}

public class AIRateInquiryRequest
{
    public decimal Weight { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public string? Origin { get; set; }
    public string? Destination { get; set; }
}

public class AIRateInquiryResponse
{
    public string ServiceType { get; set; } = string.Empty;
    public decimal Cost { get; set; }
    public string EstimatedDelivery { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
}

public class AIFileComplaintRequest
{
    public string TrackingNumber { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Type { get; set; }
    public string? CustomerContact { get; set; }
}

public class AIComplaintResponse
{
    public string ComplaintId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class AICustomerResponse
{
    public bool Found { get; set; }
    public CustomerInfo? Customer { get; set; }
    public List<RecentShipment> RecentShipments { get; set; } = new();
}

public class CustomerInfo
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
}

public class RecentShipment
{
    public string TrackingNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
