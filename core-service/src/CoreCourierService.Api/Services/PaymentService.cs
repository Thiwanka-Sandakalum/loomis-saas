using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;

namespace CoreCourierService.Api.Services;

public class PaymentService
{
    private readonly IPaymentRepository _paymentRepository;
    private readonly IShipmentRepository _shipmentRepository;
    private readonly ITenantContext _tenantContext;

    public PaymentService(
        IPaymentRepository paymentRepository,
        IShipmentRepository shipmentRepository,
        ITenantContext tenantContext)
    {
        _paymentRepository = paymentRepository;
        _shipmentRepository = shipmentRepository;
        _tenantContext = tenantContext;
    }

    public async Task<Payment> CreatePaymentAsync(string trackingNumber, decimal amount, string method, string? transactionId)
    {
        // Verify shipment exists
        var shipment = await _shipmentRepository.GetByTrackingNumberAsync(trackingNumber);
        if (shipment == null)
            throw new Exception($"Shipment not found: {trackingNumber}");

        var payment = new Payment
        {
            TrackingNumber = trackingNumber,
            Amount = amount,
            Method = method,
            Status = "Pending",
            TransactionId = transactionId
        };

        return await _paymentRepository.CreateAsync(payment);
    }

    public async Task<Payment?> GetPaymentByIdAsync(string id)
    {
        return await _paymentRepository.GetByIdAsync(id);
    }

    public async Task<List<Payment>> GetPaymentsByTrackingNumberAsync(string trackingNumber)
    {
        return await _paymentRepository.GetByTrackingNumberAsync(trackingNumber);
    }

    public async Task<List<Payment>> GetPaymentsByStatusAsync(string status, int pageNumber, int pageSize)
    {
        return await _paymentRepository.GetByStatusAsync(status, pageNumber, pageSize);
    }

    public async Task<Payment?> UpdatePaymentStatusAsync(string id, string status)
    {
        var payment = await _paymentRepository.GetByIdAsync(id);
        if (payment == null) return null;

        payment.Status = status;
        var updated = await _paymentRepository.UpdateAsync(id, payment);
        return updated ? payment : null;
    }

    public async Task<List<Payment>> GetAllPaymentsAsync()
    {
        var payments = await _paymentRepository.GetAllAsync();
        return payments.ToList();
    }
}
