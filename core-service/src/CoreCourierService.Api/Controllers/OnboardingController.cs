using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[ApiController]
[Route("api/onboarding")]
public class OnboardingController : ControllerBase
{
    private readonly TenantService _tenantService;
    private readonly TenantUserService _tenantUserService;
    private readonly RateService _rateService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<OnboardingController> _logger;

    public OnboardingController(
        TenantService tenantService,
        TenantUserService tenantUserService,
        RateService rateService,
        ITenantContext tenantContext,
        ILogger<OnboardingController> logger)
    {
        _tenantService = tenantService;
        _tenantUserService = tenantUserService;
        _rateService = rateService;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    /// <summary>
    /// Auto-create tenant when first admin signs up via Auth0
    /// </summary>
    [HttpPost("setup")]
    public async Task<ActionResult<OnboardingResponse>> SetupTenant([FromBody] SetupTenantRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.CompanyName))
            {
                return BadRequest(new { error = "Company name is required" });
            }

            if (string.IsNullOrWhiteSpace(request.Plan))
            {
                return BadRequest(new { error = "Plan is required" });
            }

            if (request.EnabledServices == null || request.EnabledServices.Count == 0)
            {
                return BadRequest(new { error = "Enabled services are required" });
            }

            // Get Auth0 user ID from authenticated user claims (set by Auth0 middleware)
            if (!User.Identity?.IsAuthenticated ?? true)
            {
                return Unauthorized(new { error = "Missing Auth0 JWT token" });
            }

            var auth0UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var email = User.FindFirst("email")?.Value ?? "unknown@example.com";
            var name = User.FindFirst("name")?.Value;

            if (string.IsNullOrEmpty(auth0UserId))
            {
                return Unauthorized(new { error = "Invalid Auth0 token - missing user ID" });
            }

            // Check if user already belongs to a tenant
            var existingTenantUser = await _tenantUserService.GetByAuth0UserIdAsync(auth0UserId);
            if (existingTenantUser != null)
            {
                return BadRequest(new { error = "User already belongs to a tenant", tenantId = existingTenantUser.TenantId });
            }

            // Create new tenant
            var tenant = new Tenant
            {
                Name = request.CompanyName,
                Plan = request.Plan,
                EnabledServices = request.EnabledServices
            };

            if (request.Branding != null)
            {
                tenant.Branding = new TenantBranding
                {
                    PrimaryColor = request.Branding.PrimaryColor ?? "#000000",
                    Tone = request.Branding.Tone ?? "professional",
                    LogoUrl = request.Branding.LogoUrl
                };
            }

            var createdTenant = await _tenantService.CreateTenantAsync(tenant);

            // Set tenant context for subsequent onboarding operations
            _tenantContext.SetTenant(createdTenant.Id);

            _logger.LogInformation(
                "Created new tenant {TenantId} for Auth0 user {Auth0UserId}",
                createdTenant.Id, auth0UserId);

            // Create tenant user mapping as admin
            var tenantUser = new TenantUser
            {
                Auth0UserId = auth0UserId,
                TenantId = createdTenant.Id,
                Email = email,
                Name = name,
                Role = "admin", // First user is always admin
                Status = "active",
                InvitedAt = DateTime.UtcNow
            };

            await _tenantUserService.CreateTenantUserAsync(
                auth0UserId,
                email,
                "admin",
                name
            );

            _logger.LogInformation(
                "Created admin tenant user mapping for {Auth0UserId} → Tenant {TenantId}",
                auth0UserId, createdTenant.Id);

            var response = new OnboardingResponse(
                createdTenant.Id,
                createdTenant.Name,
                createdTenant.ApiKey,
                createdTenant.Plan,
                "admin",
                "Tenant created successfully. You are now the admin.",
                createdTenant.Onboarding
            );

            return CreatedAtAction(nameof(SetupTenant), response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during tenant setup");
            return StatusCode(500, new { error = "Failed to setup tenant", details = ex.Message });
        }
    }

    /// <summary>
    /// Accept invitation and join existing tenant
    /// </summary>
    [HttpPost("accept-invite")]
    public async Task<ActionResult> AcceptInvitation([FromBody] AcceptInviteRequest request)
    {
        // Get Auth0 user ID from authenticated user claims
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return Unauthorized(new { error = "Missing Auth0 JWT token" });
        }

        var auth0UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(auth0UserId))
        {
            return Unauthorized(new { error = "Invalid Auth0 token" });
        }

        // TODO: Look up pending invitation by email and token
        // Update invitation status from "invited" to "active"
        // Link Auth0UserId to existing tenant_user record

        return Ok(new { message = "Invitation accepted - implementation pending" });
    }

    /// <summary>
    /// Update company profile details (onboarding step 1)
    /// </summary>
    [HttpPut("company-profile")]
    public async Task<ActionResult<OnboardingStatusResponse>> UpdateCompanyProfile([FromBody] CompanyProfileRequest request)
    {
        var (auth0UserId, errorResult) = GetAuth0UserId();
        if (errorResult != null)
        {
            return errorResult;
        }

        var profileErrors = ValidateCompanyProfile(request);
        if (profileErrors.Count > 0)
        {
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", details = profileErrors } });
        }

        var tenantUser = await _tenantUserService.GetByAuth0UserIdAsync(auth0UserId!);
        if (tenantUser == null)
        {
            return NotFound(new { error = "Tenant user not found" });
        }

        var profile = new CompanyProfile
        {
            OrganizationName = request.OrganizationName,
            CorporateWebsite = request.CorporateWebsite,
            PrimaryLanguage = request.PrimaryLanguage,
            Description = request.Description,
            SupportEmail = request.SupportEmail,
            SupportPhone = request.SupportPhone,
            HeadquartersAddress = request.HeadquartersAddress
        };

        var updatedTenant = await _tenantService.UpdateCompanyProfileAsync(tenantUser.TenantId, profile);
        if (updatedTenant == null)
        {
            return NotFound(new { error = "Tenant not found" });
        }

        return Ok(new OnboardingStatusResponse(
            updatedTenant.Id,
            updatedTenant.Onboarding.ProfileCompleted,
            updatedTenant.Onboarding.RatesCompleted,
            updatedTenant.Onboarding.Status
        ));
    }

    /// <summary>
    /// Add rates as part of onboarding (onboarding step 2)
    /// </summary>
    [HttpPost("rates")]
    public async Task<ActionResult<OnboardingStatusResponse>> AddOnboardingRates([FromBody] OnboardingRatesRequest request)
    {
        var (auth0UserId, errorResult) = GetAuth0UserId();
        if (errorResult != null)
        {
            return errorResult;
        }

        var rateErrors = ValidateOnboardingRates(request);
        if (rateErrors.Count > 0)
        {
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", details = rateErrors } });
        }

        var tenantUser = await _tenantUserService.GetByAuth0UserIdAsync(auth0UserId!);
        if (tenantUser == null)
        {
            return NotFound(new { error = "Tenant user not found" });
        }

        var tenant = await _tenantService.GetByIdAsync(tenantUser.TenantId);
        if (tenant == null)
        {
            return NotFound(new { error = "Tenant not found" });
        }

        var enabledServices = tenant.EnabledServices ?? new List<string>();
        var missingServices = enabledServices
            .Where(s => request.Rates.All(r => !string.Equals(r.ServiceType, s, StringComparison.OrdinalIgnoreCase)))
            .ToList();

        if (missingServices.Count > 0)
        {
            return BadRequest(new
            {
                error = new
                {
                    code = "MISSING_RATES",
                    details = missingServices.Select(s => $"Missing rate for service type: {s}").ToList()
                }
            });
        }

        _tenantContext.SetTenant(tenantUser.TenantId);

        foreach (var rate in request.Rates)
        {
            await _rateService.CreateRateAsync(
                rate.ServiceType,
                rate.BaseRate,
                rate.AdditionalKgRate,
                rate.MinWeight,
                rate.MaxWeight);
        }

        var updatedTenant = await _tenantService.MarkRatesCompletedAsync(tenantUser.TenantId);
        if (updatedTenant == null)
        {
            return NotFound(new { error = "Tenant not found" });
        }

        return Ok(new OnboardingStatusResponse(
            updatedTenant.Id,
            updatedTenant.Onboarding.ProfileCompleted,
            updatedTenant.Onboarding.RatesCompleted,
            updatedTenant.Onboarding.Status
        ));
    }

    /// <summary>
    /// Get current onboarding status
    /// </summary>
    [HttpGet("status")]
    public async Task<ActionResult<OnboardingStatusResponse>> GetOnboardingStatus()
    {
        var (auth0UserId, errorResult) = GetAuth0UserId();
        if (errorResult != null)
        {
            return errorResult;
        }

        var tenantUser = await _tenantUserService.GetByAuth0UserIdAsync(auth0UserId!);
        if (tenantUser == null)
        {
            // Auto-create new tenant and user mapping for first-time user
            var newTenant = new Tenant
            {
                Name = $"New Tenant ({auth0UserId})",
                Plan = "free",
                EnabledServices = new List<string> { "Standard" },
                Onboarding = new OnboardingStatus { ProfileCompleted = false, RatesCompleted = false, Status = "pending" }
            };
            var createdTenant = await _tenantService.CreateTenantAsync(newTenant);
            _tenantContext.SetTenant(createdTenant.Id);

            var email = User.FindFirst("email")?.Value ?? "unknown@example.com";
            var name = User.FindFirst("name")?.Value;
            await _tenantUserService.CreateTenantUserAsync(auth0UserId!, email, "admin", name);

            return Ok(new OnboardingStatusResponse(
                createdTenant.Id,
                false,
                false,
                "pending"
            ));
        }

        var tenant = await _tenantService.GetByIdAsync(tenantUser.TenantId);
        if (tenant == null)
        {
            return NotFound(new { error = "Tenant not found" });
        }

        return Ok(new OnboardingStatusResponse(
            tenant.Id,
            tenant.Onboarding.ProfileCompleted,
            tenant.Onboarding.RatesCompleted,
            tenant.Onboarding.Status
        ));
    }

    private (string? auth0UserId, ActionResult? errorResult) GetAuth0UserId()
    {
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return (null, Unauthorized(new { error = "Missing Auth0 JWT token" }));
        }

        var auth0UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        // Defensive: If user is authenticated, but sub is missing, try to get from HttpContext.Items (set by TenantResolver)
        if (string.IsNullOrEmpty(auth0UserId))
        {
            if (HttpContext.Items.TryGetValue("TenantId", out var tenantIdObj) && tenantIdObj is string tenantId && !string.IsNullOrEmpty(tenantId))
            {
                // Use tenantId as fallback (not ideal, but prevents false negatives)
                return (tenantId, null);
            }
            return (null, Unauthorized(new { error = "Invalid Auth0 token - missing user ID" }));
        }
        return (auth0UserId, null);
    }

    private static List<string> ValidateCompanyProfile(CompanyProfileRequest request)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(request.OrganizationName))
            errors.Add("Organization name is required");
        if (string.IsNullOrWhiteSpace(request.CorporateWebsite))
            errors.Add("Corporate website is required");
        if (string.IsNullOrWhiteSpace(request.PrimaryLanguage))
            errors.Add("Primary language is required");
        if (string.IsNullOrWhiteSpace(request.Description))
            errors.Add("Company description is required");
        if (string.IsNullOrWhiteSpace(request.SupportEmail))
            errors.Add("Support email is required");
        if (string.IsNullOrWhiteSpace(request.SupportPhone))
            errors.Add("Support phone is required");
        if (string.IsNullOrWhiteSpace(request.HeadquartersAddress))
            errors.Add("Headquarters address is required");

        if (!string.IsNullOrWhiteSpace(request.SupportEmail))
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(request.SupportEmail);
                if (addr.Address != request.SupportEmail)
                {
                    errors.Add("Support email format is invalid");
                }
            }
            catch
            {
                errors.Add("Support email format is invalid");
            }
        }

        if (!string.IsNullOrWhiteSpace(request.CorporateWebsite)
            && !Uri.TryCreate(request.CorporateWebsite, UriKind.Absolute, out _))
        {
            errors.Add("Corporate website URL is invalid");
        }

        if (!string.IsNullOrWhiteSpace(request.SupportPhone))
        {
            var cleaned = new string(request.SupportPhone.Where(c => char.IsDigit(c) || c == '+').ToArray());
            if (cleaned.Length < 10 || cleaned.Length > 15)
            {
                errors.Add("Support phone format is invalid");
            }
        }

        return errors;
    }

    private static List<string> ValidateOnboardingRates(OnboardingRatesRequest request)
    {
        var errors = new List<string>();

        if (request.Rates == null || request.Rates.Count == 0)
        {
            errors.Add("At least one rate is required");
            return errors;
        }

        for (var i = 0; i < request.Rates.Count; i++)
        {
            var rate = request.Rates[i];
            if (string.IsNullOrWhiteSpace(rate.ServiceType))
                errors.Add($"Rates[{i}].serviceType is required");
            if (rate.BaseRate < 0)
                errors.Add($"Rates[{i}].baseRate cannot be negative");
            if (rate.AdditionalKgRate < 0)
                errors.Add($"Rates[{i}].additionalKgRate cannot be negative");
            if (rate.MinWeight < 0)
                errors.Add($"Rates[{i}].minWeight cannot be negative");
            if (rate.MaxWeight <= rate.MinWeight)
                errors.Add($"Rates[{i}].maxWeight must be greater than minWeight");
        }

        return errors;
    }
}

// DTOs
public record SetupTenantRequest(
    string CompanyName,
    string? Plan = null,
    List<string>? EnabledServices = null,
    TenantBrandingRequest? Branding = null
);

public record TenantBrandingRequest(
    string? PrimaryColor = null,
    string? Tone = null,
    string? LogoUrl = null
);

public record OnboardingResponse(
    string TenantId,
    string TenantName,
    string ApiKey,
    string Plan,
    string Role,
    string Message,
    OnboardingStatus Onboarding
);

public record AcceptInviteRequest(
    string InvitationToken
);

public record CompanyProfileRequest(
    string OrganizationName,
    string CorporateWebsite,
    string PrimaryLanguage,
    string Description,
    string SupportEmail,
    string SupportPhone,
    string HeadquartersAddress
);

public record OnboardingRatesRequest(
    List<CreateRateRequest> Rates
);

public record OnboardingStatusResponse(
    string TenantId,
    bool ProfileCompleted,
    bool RatesCompleted,
    string Status
);
