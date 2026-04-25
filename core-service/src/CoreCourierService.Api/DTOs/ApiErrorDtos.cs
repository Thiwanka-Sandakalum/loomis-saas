namespace CoreCourierService.Api.DTOs;

public record ApiErrorDto(string Code, string Message, object? Details = null);

public record ApiErrorEnvelope(ApiErrorDto Error);

public static class ApiErrors
{
    public static ApiErrorEnvelope Create(string code, string message, object? details = null)
        => new(new ApiErrorDto(code, message, details));
}
