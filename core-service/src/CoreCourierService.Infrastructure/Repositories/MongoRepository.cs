using CoreCourierService.Core.Entities;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System.Linq.Expressions;
using System.Reflection;

namespace CoreCourierService.Infrastructure.Repositories;

public class MongoRepository<T> : IRepository<T> where T : BaseEntity
{
    protected readonly IMongoCollection<T> _collection;
    protected readonly ITenantContext? _tenantContext;

    public MongoRepository(IOptions<MongoDbSettings> settings, ITenantContext? tenantContext = null)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        var database = client.GetDatabase(settings.Value.DatabaseName);

        var collectionName = GetCollectionName();
        _collection = database.GetCollection<T>(collectionName);
        _tenantContext = tenantContext;
    }

    private static string GetCollectionName()
    {
        var attribute = typeof(T).GetCustomAttribute<BsonCollectionAttribute>();
        return attribute?.CollectionName ?? typeof(T).Name.ToLowerInvariant() + "s";
    }

    protected FilterDefinition<T> ApplyTenantFilter(FilterDefinition<T>? filter = null)
    {
        if (typeof(TenantEntity).IsAssignableFrom(typeof(T)) && !string.IsNullOrEmpty(_tenantContext?.TenantId))
        {
            var tenantFilter = Builders<T>.Filter.Eq("tenant_id", _tenantContext.TenantId);
            return filter == null ? tenantFilter : Builders<T>.Filter.And(filter, tenantFilter);
        }
        return filter ?? Builders<T>.Filter.Empty;
    }

    public virtual async Task<T?> GetByIdAsync(string id)
    {
        var filter = Builders<T>.Filter.Eq(x => x.Id, id);
        filter = ApplyTenantFilter(filter);
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public virtual async Task<IEnumerable<T>> GetAllAsync()
    {
        var filter = ApplyTenantFilter();
        return await _collection.Find(filter).ToListAsync();
    }

    public virtual async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate)
    {
        var filter = ApplyTenantFilter(Builders<T>.Filter.Where(predicate));
        return await _collection.Find(filter).ToListAsync();
    }

    public virtual async Task<T?> FindOneAsync(Expression<Func<T, bool>> predicate)
    {
        var filter = ApplyTenantFilter(Builders<T>.Filter.Where(predicate));
        return await _collection.Find(filter).FirstOrDefaultAsync();
    }

    public virtual async Task<T> CreateAsync(T entity)
    {
        if (entity is TenantEntity tenantEntity && !string.IsNullOrEmpty(_tenantContext?.TenantId))
        {
            tenantEntity.TenantId = _tenantContext.TenantId;
        }

        entity.CreatedAt = DateTime.UtcNow;
        entity.UpdatedAt = DateTime.UtcNow;

        await _collection.InsertOneAsync(entity);
        return entity;
    }

    public virtual async Task<bool> UpdateAsync(string id, T entity)
    {
        var filter = Builders<T>.Filter.Eq(x => x.Id, id);
        filter = ApplyTenantFilter(filter);

        entity.UpdatedAt = DateTime.UtcNow;

        var result = await _collection.ReplaceOneAsync(filter, entity);
        return result.ModifiedCount > 0;
    }

    public virtual async Task<bool> DeleteAsync(string id)
    {
        var filter = Builders<T>.Filter.Eq(x => x.Id, id);
        filter = ApplyTenantFilter(filter);

        var result = await _collection.DeleteOneAsync(filter);
        return result.DeletedCount > 0;
    }

    public virtual async Task<long> CountAsync(Expression<Func<T, bool>> predicate)
    {
        var filter = ApplyTenantFilter(Builders<T>.Filter.Where(predicate));
        return await _collection.CountDocumentsAsync(filter);
    }

    public virtual async Task<(IEnumerable<T> items, long total)> GetPagedAsync(
        Expression<Func<T, bool>>? filter,
        int page,
        int pageSize,
        Expression<Func<T, object>>? orderBy = null)
    {
        var filterDef = filter != null
            ? ApplyTenantFilter(Builders<T>.Filter.Where(filter))
            : ApplyTenantFilter();

        var total = await _collection.CountDocumentsAsync(filterDef);

        var query = _collection.Find(filterDef)
            .Skip((page - 1) * pageSize)
            .Limit(pageSize);

        if (orderBy != null)
        {
            query = query.SortBy(orderBy);
        }

        var items = await query.ToListAsync();
        return (items, total);
    }
}
