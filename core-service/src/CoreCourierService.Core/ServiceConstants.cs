namespace CoreCourierService.Core;

public static class ServiceConstants
{
    public static class ServiceTypes
    {
        public const string Standard = "Standard";
        public const string Express = "Express";
        public const string Overnight = "Overnight";

        public static readonly string[] All = [Standard, Express, Overnight];

        public static string Canonicalize(string? serviceType)
        {
            if (string.IsNullOrWhiteSpace(serviceType))
            {
                return string.Empty;
            }

            return serviceType.Trim().ToLowerInvariant() switch
            {
                "standard" => Standard,
                "express" => Express,
                "overnight" => Overnight,
                _ => serviceType.Trim()
            };
        }
    }

    public static class DeliveryDays
    {
        public const int Standard = 5;
        public const int Express = 2;
        public const int Overnight = 1;

        public static int GetDays(string? serviceType) => ServiceTypes.Canonicalize(serviceType) switch
        {
            ServiceTypes.Standard => Standard,
            ServiceTypes.Express => Express,
            ServiceTypes.Overnight => Overnight,
            _ => Standard
        };
    }

    public static class ShipmentStatuses
    {
        public const string Created = "Created";
        public const string PickedUp = "PickedUp";
        public const string InTransit = "InTransit";
        public const string OutForDelivery = "OutForDelivery";
        public const string Delivered = "Delivered";
        public const string Cancelled = "Cancelled";
    }

    public static class UserRoles
    {
        public const string Admin = "admin";
        public const string Csr = "csr";
        public const string Customer = "customer";

        public static readonly string[] All = [Admin, Csr, Customer];
    }

    public static class TenantPlans
    {
        public const string Free = "free";
        public const string Pro = "pro";
        public const string Enterprise = "enterprise";
    }

    public static class UserStatuses
    {
        public const string Active = "active";
        public const string Invited = "invited";
        public const string Inactive = "inactive";
    }

    public static class PaymentStatuses
    {
        public const string Pending = "Pending";
        public const string Completed = "Completed";
        public const string Failed = "Failed";
        public const string Refunded = "Refunded";
    }

    public static class ComplaintStatuses
    {
        public const string Open = "Open";
        public const string InProgress = "InProgress";
        public const string Resolved = "Resolved";
        public const string Closed = "Closed";
    }

    public static class IntegrationTypes
    {
        public const string Telegram = "telegram";
        public const string WhatsApp = "whatsapp";
    }

    public static class MessageDirections
    {
        public const string Inbound = "inbound";
        public const string Outbound = "outbound";
    }

    public static class Channels
    {
        public const string Telegram = "telegram";
        public const string WhatsApp = "whatsapp";
        public const string Web = "web";
    }
}
