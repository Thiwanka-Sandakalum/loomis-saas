using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpPost]
    public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentRequest request)
    {
        var payment = await _paymentService.CreatePaymentAsync(
            request.TrackingNumber,
            request.Amount,
            request.Method,
            request.TransactionId);

        return CreatedAtAction(nameof(GetPayment), new { paymentId = payment.Id }, payment);
    }

    [HttpGet]
    public async Task<IActionResult> GetPayments([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!string.IsNullOrEmpty(status))
        {
            var payments = await _paymentService.GetPaymentsByStatusAsync(status, page, pageSize);
            return Ok(new { data = payments, pagination = new { page, pageSize } });
        }

        var (allPayments, total) = await _paymentService.GetAllPagedAsync(page, pageSize);
        return Ok(new { data = allPayments, pagination = new { page, pageSize, total } });
    }

    [HttpGet("{paymentId}")]
    public async Task<IActionResult> GetPayment(string paymentId)
    {
        var payment = await _paymentService.GetPaymentByIdAsync(paymentId);
        if (payment == null)
            return NotFound(ApiErrors.Create("NOT_FOUND", "Payment not found"));

        return Ok(payment);
    }

    [HttpGet("shipment/{trackingNumber}")]
    public async Task<IActionResult> GetPaymentsByShipment(string trackingNumber)
    {
        var payments = await _paymentService.GetPaymentsByTrackingNumberAsync(trackingNumber);
        return Ok(new { data = payments });
    }

    [HttpPatch("{paymentId}/status")]
    public async Task<IActionResult> UpdatePaymentStatus(string paymentId, [FromBody] UpdatePaymentStatusRequest request)
    {
        var payment = await _paymentService.UpdatePaymentStatusAsync(paymentId, request.Status);
        if (payment == null)
            return NotFound(ApiErrors.Create("NOT_FOUND", "Payment not found"));

        return Ok(payment);
    }
}
