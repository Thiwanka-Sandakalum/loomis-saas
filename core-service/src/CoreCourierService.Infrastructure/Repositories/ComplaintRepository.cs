using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace CoreCourierService.Infrastructure.Repositories;

public class ComplaintRepository : MongoRepository<Complaint>, IComplaintRepository
{
    public ComplaintRepository(
        IOptions<MongoDbSettings> settings,
        ITenantContext tenantContext)
        : base(settings, tenantContext)
    {
    }

    public async Task<List<Complaint>> GetByTrackingNumberAsync(string trackingNumber)
    {
        var filter = Builders<Complaint>.Filter.Eq(c => c.TrackingNumber, trackingNumber);
        filter = ApplyTenantFilter(filter);

        return await _collection.Find(filter).ToListAsync();
    }

    public async Task<List<Complaint>> GetByStatusAsync(string status, int pageNumber, int pageSize)
    {
        var filter = Builders<Complaint>.Filter.Eq(c => c.Status, status);
        filter = ApplyTenantFilter(filter);

        return await _collection.Find(filter)
            .Skip((pageNumber - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();
    }

    public async Task<List<Complaint>> GetByTypeAsync(string type, int pageNumber, int pageSize)
    {
        var filter = Builders<Complaint>.Filter.Eq(c => c.Type, type);
        filter = ApplyTenantFilter(filter);

        return await _collection.Find(filter)
            .Skip((pageNumber - 1) * pageSize)
            .Limit(pageSize)
            .ToListAsync();
    }
}
