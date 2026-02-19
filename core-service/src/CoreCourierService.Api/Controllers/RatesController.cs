using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[ApiController]
[Route("api/rates")]
public class RatesController : ControllerBase
{
    private readonly RateService _rateService;

    public RatesController(RateService rateService)
    {
        _rateService = rateService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateRate([FromBody] CreateRateRequest request)
    {
        var rate = await _rateService.CreateRateAsync(
            request.ServiceType,
            request.BaseRate,
            request.AdditionalKgRate,
            request.MinWeight,
            request.MaxWeight);

        return CreatedAtAction(nameof(GetRate), new { rateId = rate.Id }, rate);
    }

    [HttpGet]
    public async Task<IActionResult> GetRates()
    {
        var rates = await _rateService.GetAllRatesAsync();
        return Ok(new { data = rates });
    }

    [HttpGet("{rateId}")]
    public async Task<IActionResult> GetRate(string rateId)
    {
        var rate = await _rateService.GetRateByIdAsync(rateId);
        if (rate == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Rate not found" } });

        return Ok(rate);
    }

    [HttpPatch("{rateId}")]
    public async Task<IActionResult> UpdateRate(string rateId, [FromBody] UpdateRateRequest request)
    {
        var rate = await _rateService.UpdateRateAsync(
            rateId,
            request.BaseRate,
            request.AdditionalKgRate,
            request.MinWeight,
            request.MaxWeight);

        if (rate == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Rate not found" } });

        return Ok(rate);
    }

    [HttpDelete("{rateId}")]
    public async Task<IActionResult> DeleteRate(string rateId)
    {
        var deleted = await _rateService.DeleteRateAsync(rateId);
        if (!deleted)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Rate not found" } });

        return NoContent();
    }

    [HttpPost("calculate")]
    public async Task<IActionResult> CalculateRate([FromBody] CalculateRateRequest request)
    {
        try
        {
            var (total, baseRate, additionalCharges, estimatedDelivery) =
                await _rateService.CalculateRateAsync(request.ServiceType, request.Weight);

            var response = new RateCalculationResponse
            {
                ServiceType = request.ServiceType,
                Weight = request.Weight,
                BaseRate = baseRate,
                AdditionalCharges = additionalCharges,
                Total = total,
                Currency = "USD",
                EstimatedDelivery = estimatedDelivery
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = new { code = "CALCULATION_ERROR", message = ex.Message } });
        }
    }
}
