using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using CoreCourierService.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[ApiController]
[Route("api/tenants")]
public class TenantsController : ControllerBase
{
    private readonly TenantService _tenantService;
    private readonly ILogger<TenantsController> _logger;

    public TenantsController(TenantService tenantService, ILogger<TenantsController> logger)
    {
        _tenantService = tenantService;
        _logger = logger;
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<TenantResponse>> CreateTenant([FromBody] CreateTenantRequest request)
    {
        var tenant = new Tenant
        {
            Name = request.Name,
            Plan = request.Plan
        };

        var created = await _tenantService.CreateTenantAsync(tenant);

        var response = new TenantResponse(
            created.Id,
            created.Name,
            created.ApiKey,
            created.Plan,
            created.CreatedAt);

        return CreatedAtAction(nameof(GetTenant), new { id = created.Id }, response);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TenantResponse>> GetTenant(string id)
    {
        var tenant = await _tenantService.GetByIdAsync(id);

        if (tenant == null)
            return NotFound(new { error = "Tenant not found" });

        var response = new TenantResponse(
            tenant.Id,
            tenant.Name,
            tenant.ApiKey,
            tenant.Plan,
            tenant.CreatedAt);

        return Ok(response);
    }
}
