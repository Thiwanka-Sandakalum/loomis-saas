using System.Linq.Expressions;

namespace CoreCourierService.Core.Interfaces;

public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(string id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate);
    Task<T?> FindOneAsync(Expression<Func<T, bool>> predicate);
    Task<T> CreateAsync(T entity);
    Task<bool> UpdateAsync(string id, T entity);
    Task<bool> DeleteAsync(string id);
    Task<long> CountAsync(Expression<Func<T, bool>> predicate);
    Task<(IEnumerable<T> items, long total)> GetPagedAsync(
        Expression<Func<T, bool>>? filter,
        int page,
        int pageSize,
        Expression<Func<T, object>>? orderBy = null);
}
