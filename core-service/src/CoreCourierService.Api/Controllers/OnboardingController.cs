using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/onboarding")]
public class OnboardingController : ControllerBase
{
    private readonly ITenantService _tenantService;
    private readonly ITenantUserService _tenantUserService;
    private readonly IRateService _rateService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<OnboardingController> _logger;

    public OnboardingController(
        ITenantService tenantService,
        ITenantUserService tenantUserService,
        IRateService rateService,
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
                return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "Company name is required"));
            }

            if (string.IsNullOrWhiteSpace(request.Plan))
            {
                return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "Plan is required"));
            }

            if (request.EnabledServices == null || request.EnabledServices.Count == 0)
            {
                return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "Enabled services are required"));
            }

            // Get Auth0 user ID from authenticated user claims (set by Auth0 middleware)
            if (!User.Identity?.IsAuthenticated ?? true)
            {
                return Unauthorized(ApiErrors.Create("UNAUTHORIZED", "Missing Auth0 JWT token"));
            }

            var auth0UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var email = User.FindFirst("email")?.Value ?? "unknown@example.com";
            var name = User.FindFirst("name")?.Value;

            if (string.IsNullOrEmpty(auth0UserId))
            {
                return Unauthorized(ApiErrors.Create("UNAUTHORIZED", "Invalid Auth0 token - missing user ID"));
            }

            // Check if user already belongs to a tenant
            var existingTenantUser = await _tenantUserService.GetByAuth0UserIdAsync(auth0UserId);
            if (existingTenantUser != null)
            {
                return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "User already belongs to a tenant", new { tenantId = existingTenantUser.TenantId }));
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
            return StatusCode(500, ApiErrors.Create("INTERNAL_ERROR", "Failed to setup tenant"));
        }
    }

    /// <summary>
    /// Accept invitation and join existing tenant
    /// </summary>
    [HttpPost("accept-invite")]
    public async Task<ActionResult> AcceptInvitation([FromBody] AcceptInviteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.InvitationToken))
        {
            return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "Invitation token is required"));
        }

        // Get Auth0 user ID from authenticated user claims
        if (!User.Identity?.IsAuthenticated ?? true)
        {
            return Unauthorized(ApiErrors.Create("UNAUTHORIZED", "Missing Auth0 JWT token"));
        }

        var auth0UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(auth0UserId))
        {
            return Unauthorized(ApiErrors.Create("UNAUTHORIZED", "Invalid Auth0 token"));
        }

        // Email is required to match the pending invitation record
        var email = User.FindFirst("email")?.Value;
        if (string.IsNullOrEmpty(email))
        {
            return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "Email claim missing from token. Ensure the email is included in your Auth0 token."));
        }

        // Check if user already belongs to a tenant (already accepted or self-registered)
        var existing = await _tenantUserService.GetByAuth0UserIdAsync(auth0UserId);
        if (existing != null && !existing.Auth0UserId.StartsWith("pending_"))
        {
            return BadRequest(ApiErrors.Create("ALREADY_MEMBER", "User already belongs to a tenant", new { tenantId = existing.TenantId }));
        }

        var tenantUser = await _tenantUserService.AcceptInvitationAsync(auth0UserId, email, request.InvitationToken);
        if (tenantUser == null)
        {
            return NotFound(ApiErrors.Create("NOT_FOUND", "No pending invitation found for this email address and token"));
        }

        return Ok(new
        {
            message = "Invitation accepted successfully",
            tenantId = tenantUser.TenantId,
            role = tenantUser.Role
        });
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
            return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "Invalid company profile", profileErrors));
        }

        var tenantUser = await _tenantUserService.GetByAuth0UserIdAsync(auth0UserId!);
        if (tenantUser == null)
        {
            return NotFound(ApiErrors.Create("NOT_FOUND", "Tenant user not found"));
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
            return NotFound(ApiErrors.Create("NOT_FOUND", "Tenant not found"));
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
            return BadRequest(ApiErrors.Create("VALIDATION_ERROR", "Invalid onboarding rates", rateErrors));
        }

        var tenantUser = await _tenantUserService.GetByAuth0UserIdAsync(auth0UserId!);
        if (tenantUser == null)
        {
            return NotFound(ApiErrors.Create("NOT_FOUND", "Tenant user not found"));
        }

        var tenant = await _tenantService.GetByIdAsync(tenantUser.TenantId);
        if (tenant == null)
        {
            return NotFound(ApiErrors.Create("NOT_FOUND", "Tenant not found"));
        }


        // Allow fully dynamic service types: do not require rates for all enabledServices

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
            return NotFound(ApiErrors.Create("NOT_FOUND", "Tenant not found"));
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
            return NotFound(ApiErrors.Create("NOT_FOUND", "Tenant not found"));
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
            return (null, Unauthorized(ApiErrors.Create("UNAUTHORIZED", "Missing Auth0 JWT token")));
        }

        var auth0UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(auth0UserId))
        {
            return (null, Unauthorized(ApiErrors.Create("UNAUTHORIZED", "Invalid Auth0 token - missing user ID")));
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
