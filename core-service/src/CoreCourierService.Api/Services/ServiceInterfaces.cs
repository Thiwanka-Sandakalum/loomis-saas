using CoreCourierService.Core.Entities;
using MongoDB.Bson;

namespace CoreCourierService.Api.Services;

public interface ITenantService
{
    Task<Tenant> CreateTenantAsync(Tenant tenant);
    Task<Tenant?> GetByIdAsync(string id);
    Task<Tenant?> UpdateCompanyProfileAsync(string tenantId, CompanyProfile profile);
    Task<Tenant?> MarkRatesCompletedAsync(string tenantId);
    Task<Tenant?> GetByClientIdAsync(string clientId);
    Task<IEnumerable<Tenant>> GetAllAsync();
}

public interface IShipmentService
{
    Task<Shipment> CreateShipmentAsync(Shipment shipment);
    Task<Shipment?> GetByTrackingNumberAsync(string trackingNumber);
    Task<Shipment?> GetShipmentByIdAsync(string id);
    Task<(IEnumerable<Shipment> shipments, long total)> GetShipmentsAsync(int page, int pageSize, string? status = null);
    Task<Shipment?> UpdateStatusAsync(string trackingNumber, string newStatus, string location);
    Task<long> GetTotalCountAsync();
    Task<long> GetCountByStatusAsync(string status);
    Task<long> GetActiveCountAsync();
}

public interface ITenantUserService
{
    Task<TenantUser> CreateTenantUserAsync(string auth0UserId, string email, string role, string? name = null, string? invitedBy = null);
    Task<TenantUser> InviteUserAsync(string email, string role, string invitedBy);
    Task<TenantUser?> ResendInvitationAsync(string email);
    Task<bool> RevokeInvitationAsync(string tenantUserId);
    Task<TenantUser?> AcceptInvitationAsync(string auth0UserId, string email, string invitationToken);
    Task<IEnumerable<TenantUser>> GetTenantUsersAsync();
    Task<bool> UpdateUserRoleAsync(string tenantUserId, string newRole);
    Task<bool> RemoveUserAsync(string tenantUserId);
    Task<TenantUser?> GetByAuth0UserIdAsync(string auth0UserId);
}

public interface IShipmentEventService
{
    Task<ShipmentEvent> CreateEventAsync(string trackingNumber, string status, string location, string? notes);
    Task<List<ShipmentEvent>> GetEventsByTrackingNumberAsync(string trackingNumber);
}

public interface IRateService
{
    Task<Rate> CreateRateAsync(string serviceType, decimal baseRate, decimal additionalKgRate, decimal minWeight, decimal maxWeight);
    Task<Rate?> GetRateByIdAsync(string id);
    Task<List<Rate>> GetAllRatesAsync();
    Task<Rate?> UpdateRateAsync(string id, decimal? baseRate, decimal? additionalKgRate, decimal? minWeight, decimal? maxWeight);
    Task<bool> DeleteRateAsync(string id);
    Task<(decimal total, decimal baseRate, decimal additionalCharges, string estimatedDelivery)> CalculateRateAsync(string serviceType, decimal weight);
}

public interface IPaymentService
{
    Task<Payment> CreatePaymentAsync(string trackingNumber, decimal amount, string method, string? transactionId);
    Task<Payment?> GetPaymentByIdAsync(string id);
    Task<List<Payment>> GetPaymentsByTrackingNumberAsync(string trackingNumber);
    Task<List<Payment>> GetPaymentsByStatusAsync(string status, int pageNumber, int pageSize);
    Task<Payment?> UpdatePaymentStatusAsync(string id, string status);
    Task<List<Payment>> GetAllPaymentsAsync();
    Task<decimal> GetCompletedRevenueAsync();
    Task<(IEnumerable<Payment> payments, long total)> GetAllPagedAsync(int page, int pageSize);
}

public interface IComplaintService
{
    Task<Complaint> CreateComplaintAsync(string trackingNumber, string type, string description, string? customerEmail, string? customerPhone);
    Task<Complaint?> GetComplaintByIdAsync(string id);
    Task<List<Complaint>> GetComplaintsByTrackingNumberAsync(string trackingNumber);
    Task<List<Complaint>> GetComplaintsByStatusAsync(string status, int pageNumber, int pageSize);
    Task<List<Complaint>> GetComplaintsByTypeAsync(string type, int pageNumber, int pageSize);
    Task<Complaint?> UpdateComplaintAsync(string id, string? status, string? resolution, string? assignedTo);
    Task<List<Complaint>> GetAllComplaintsAsync();
    Task<long> GetOpenCountAsync();
    Task<(IEnumerable<Complaint> complaints, long total)> GetAllPagedAsync(int page, int pageSize);
}

public interface ISessionService
{
    Task<Session> CreateSessionAsync(string userId, string channel, int expiryHours = 24);
    Task<Session?> GetSessionAsync(string sessionId);
    Task<List<Session>> GetUserSessionsAsync(string userId);
    Task<List<Session>> GetActiveSessionsAsync();
    Task<Session?> UpdateSessionDataAsync(string sessionId, BsonDocument data);
    Task<Session?> ExtendSessionAsync(string sessionId, int additionalHours = 24);
    Task<bool> InvalidateSessionAsync(string sessionId);
    Task<bool> InvalidateUserSessionsAsync(string userId);
    Task<int> CleanupExpiredSessionsAsync();
}

public interface ITelegramChatService
{
    Task<TelegramChat> GetOrCreateChatAsync(string chatId, string? userName, string? firstName, string? lastName);
    Task<List<TelegramChat>> GetAllChatsAsync(int skip = 0, int limit = 50);
    Task<TelegramMessage> SaveMessageAsync(string chatId, long messageId, string fromUser, string text, string direction, string? sessionId = null);
    Task<List<TelegramMessage>> GetChatHistoryAsync(string chatId, int skip = 0, int limit = 100);
    Task<int> GetChatMessageCountAsync(string chatId);
    Task<Session> GetOrCreateSessionAsync(string chatId);
}
