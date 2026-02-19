using CoreCourierService.Core.Interfaces;

namespace CoreCourierService.Infrastructure.Context;

public class TenantContext : ITenantContext
{
    private string? _tenantId;
    private string? _apiKey;

    public string? TenantId => _tenantId;
    public string? ApiKey => _apiKey;

    public void SetTenant(string tenantId, string? apiKey = null)
    {
        _tenantId = tenantId;
        _apiKey = apiKey;
    }
}
