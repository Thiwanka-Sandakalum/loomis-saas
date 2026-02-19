namespace CoreCourierService.Api.DTOs;

// Dashboard DTOs
public class DashboardOverview
{
    public int TotalShipments { get; set; }
    public int ActiveShipments { get; set; }
    public decimal TotalRevenue { get; set; }
    public int OpenComplaints { get; set; }
    public decimal DeliveryRate { get; set; }
}

public class ShipmentStats
{
    public int Total { get; set; }
    public Dictionary<string, int> ByStatus { get; set; } = new();
    public Dictionary<string, int> ByService { get; set; } = new();
    public List<TrendData> Trend { get; set; } = new();
}

public class RevenueStats
{
    public decimal Total { get; set; }
    public Dictionary<string, decimal> ByService { get; set; } = new();
    public List<RevenueTrendData> Trend { get; set; } = new();
}

public class ComplaintStats
{
    public int Total { get; set; }
    public int Open { get; set; }
    public int Resolved { get; set; }
    public Dictionary<string, int> ByType { get; set; } = new();
    public double ResolutionTime { get; set; }
}

public class TrendData
{
    public string Date { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class RevenueTrendData
{
    public string Date { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}
