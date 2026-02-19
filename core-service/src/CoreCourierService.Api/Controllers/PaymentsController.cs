using CoreCourierService.Api.DTOs;
using CoreCourierService.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CoreCourierService.Api.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly PaymentService _paymentService;

    public PaymentsController(PaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpPost]
    public async Task<IActionResult> CreatePayment([FromBody] CreatePaymentRequest request)
    {
        try
        {
            var payment = await _paymentService.CreatePaymentAsync(
                request.TrackingNumber,
                request.Amount,
                request.Method,
                request.TransactionId);

            return CreatedAtAction(nameof(GetPayment), new { paymentId = payment.Id }, payment);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = new { code = "PAYMENT_ERROR", message = ex.Message } });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetPayments([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!string.IsNullOrEmpty(status))
        {
            var payments = await _paymentService.GetPaymentsByStatusAsync(status, page, pageSize);
            return Ok(new { data = payments, pagination = new { page, pageSize } });
        }

        // TODO: Implement GetAll with pagination
        return Ok(new { data = new List<object>(), pagination = new { page, pageSize } });
    }

    [HttpGet("{paymentId}")]
    public async Task<IActionResult> GetPayment(string paymentId)
    {
        var payment = await _paymentService.GetPaymentByIdAsync(paymentId);
        if (payment == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Payment not found" } });

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
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Payment not found" } });

        return Ok(payment);
    }
}
