namespace CoreCourierService.Core.Interfaces;

public interface ITenantContext
{
    string? TenantId { get; }
    string? ApiKey { get; }
    void SetTenant(string tenantId, string? apiKey = null);
}
