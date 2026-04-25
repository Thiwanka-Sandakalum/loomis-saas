using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using System.Security.Cryptography;

namespace CoreCourierService.Api.Services;

public class TenantService : ITenantService
{
    private readonly ITenantRepository _tenantRepository;
    private readonly ILogger<TenantService> _logger;

    public TenantService(ITenantRepository tenantRepository, ILogger<TenantService> logger)
    {
        _tenantRepository = tenantRepository;
        _logger = logger;
    }

    // X-API-KEY authentication removed: GetByApiKeyAsync no longer used

    public async Task<Tenant> CreateTenantAsync(Tenant tenant)
    {
        // Generate API key
        tenant.ApiKey = GenerateApiKey();

        _logger.LogInformation("Creating new tenant: {TenantName}", tenant.Name);

        return await _tenantRepository.CreateAsync(tenant);
    }

    public async Task<Tenant?> GetByIdAsync(string id)
    {
        return await _tenantRepository.GetByIdAsync(id);
    }

    public async Task<Tenant?> UpdateCompanyProfileAsync(string tenantId, CompanyProfile profile)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant == null)
        {
            return null;
        }

        tenant.CompanyProfile = profile;
        if (!string.IsNullOrWhiteSpace(profile.OrganizationName))
        {
            tenant.Name = profile.OrganizationName;
        }

        UpdateOnboardingStatus(
            tenant,
            profileCompleted: IsProfileComplete(profile));

        var updated = await _tenantRepository.UpdateAsync(tenantId, tenant);
        return updated ? tenant : null;
    }

    public async Task<Tenant?> MarkRatesCompletedAsync(string tenantId)
    {
        var tenant = await _tenantRepository.GetByIdAsync(tenantId);
        if (tenant == null)
        {
            return null;
        }

        UpdateOnboardingStatus(tenant, ratesCompleted: true);

        var updated = await _tenantRepository.UpdateAsync(tenantId, tenant);
        return updated ? tenant : null;
    }

    public async Task<Tenant?> GetByClientIdAsync(string clientId)
    {
        // TODO: Store the Auth0 client ID as an indexed field on the Tenant entity and look up directly.
        // A full-collection scan is not acceptable in production. This method is disabled until then.
        throw new NotSupportedException(
            "GetByClientIdAsync requires a dedicated indexed field (e.g. Auth0ClientId) on Tenant. " +
            "Add the field, create a MongoDB index, and use a direct Eq filter.");
    }

    public async Task<IEnumerable<Tenant>> GetAllAsync()
    {
        return await _tenantRepository.GetAllAsync();
    }

    private static string GenerateApiKey()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        var key = Convert.ToHexString(bytes).ToLowerInvariant();
        return $"cmp_live_{key}";
    }

    private static bool IsProfileComplete(CompanyProfile profile)
    {
        return !string.IsNullOrWhiteSpace(profile.OrganizationName)
               && !string.IsNullOrWhiteSpace(profile.CorporateWebsite)
               && !string.IsNullOrWhiteSpace(profile.PrimaryLanguage)
               && !string.IsNullOrWhiteSpace(profile.Description)
               && !string.IsNullOrWhiteSpace(profile.SupportEmail)
               && !string.IsNullOrWhiteSpace(profile.SupportPhone)
               && !string.IsNullOrWhiteSpace(profile.HeadquartersAddress);
    }

    private static void UpdateOnboardingStatus(Tenant tenant, bool? profileCompleted = null, bool? ratesCompleted = null)
    {
        if (profileCompleted.HasValue)
        {
            tenant.Onboarding.ProfileCompleted = profileCompleted.Value;
        }

        if (ratesCompleted.HasValue)
        {
            tenant.Onboarding.RatesCompleted = ratesCompleted.Value;
        }

        if (tenant.Onboarding.ProfileCompleted && tenant.Onboarding.RatesCompleted)
        {
            tenant.Onboarding.Status = "done";
        }
        else if (tenant.Onboarding.ProfileCompleted && !tenant.Onboarding.RatesCompleted)
        {
            tenant.Onboarding.Status = "profile_completed";
        }
        else if (!tenant.Onboarding.ProfileCompleted && tenant.Onboarding.RatesCompleted)
        {
            tenant.Onboarding.Status = "rate_completed";
        }
        else
        {
            tenant.Onboarding.Status = "pending";
        }
    }
}
