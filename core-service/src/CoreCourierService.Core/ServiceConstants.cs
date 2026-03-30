namespace CoreCourierService.Core;

public static class ServiceConstants
{
    public static class ServiceTypes
    {
        public const string Standard = "Standard";
        public const string Express = "Express";
        public const string Overnight = "Overnight";

        public static readonly string[] All = [Standard, Express, Overnight];
    }

    public static class DeliveryDays
    {
        public const int Standard = 5;
        public const int Express = 2;
        public const int Overnight = 1;

        public static int GetDays(string serviceType) => serviceType switch
        {
            ServiceTypes.Standard => Standard,
            ServiceTypes.Express => Express,
            ServiceTypes.Overnight => Overnight,
            _ => Standard
        };
    }
}
