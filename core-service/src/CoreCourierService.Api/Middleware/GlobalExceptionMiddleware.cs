using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace CoreCourierService.Api.Middleware
{
    /// <summary>
    /// Global exception handling middleware with structured error responses
    /// </summary>
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> _logger)
        {
            _next = next;
            this._logger = _logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            var errorId = Guid.NewGuid().ToString();

            _logger.LogError(exception, "Error ID: {ErrorId} - {Message}", errorId, exception.Message);

            var response = context.Response;
            response.ContentType = "application/json";

            var errorResponse = new ErrorResponse
            {
                ErrorId = errorId,
                Timestamp = DateTime.UtcNow
            };

            switch (exception)
            {
                case ValidationException validationEx:
                    response.StatusCode = StatusCodes.Status400BadRequest;
                    errorResponse.Message = "Validation failed";
                    errorResponse.Code = "VALIDATION_ERROR";
                    errorResponse.Details = validationEx.Errors;
                    break;

                case NotFoundException notFoundEx:
                    response.StatusCode = StatusCodes.Status404NotFound;
                    errorResponse.Message = notFoundEx.Message;
                    errorResponse.Code = "NOT_FOUND";
                    break;

                case UnauthorizedException unauthorizedEx:
                    response.StatusCode = StatusCodes.Status401Unauthorized;
                    errorResponse.Message = unauthorizedEx.Message;
                    errorResponse.Code = "UNAUTHORIZED";
                    break;

                case ForbiddenException forbiddenEx:
                    response.StatusCode = StatusCodes.Status403Forbidden;
                    errorResponse.Message = forbiddenEx.Message;
                    errorResponse.Code = "FORBIDDEN";
                    break;

                case ConflictException conflictEx:
                    response.StatusCode = StatusCodes.Status409Conflict;
                    errorResponse.Message = conflictEx.Message;
                    errorResponse.Code = "CONFLICT";
                    break;

                case BusinessException businessEx:
                    response.StatusCode = StatusCodes.Status422UnprocessableEntity;
                    errorResponse.Message = businessEx.Message;
                    errorResponse.Code = "BUSINESS_RULE_VIOLATION";
                    break;

                default:
                    response.StatusCode = StatusCodes.Status500InternalServerError;
                    errorResponse.Message = "An internal server error occurred";
                    errorResponse.Code = "INTERNAL_ERROR";

                    // Don't expose internal error details in production
                    if (IsDevelopment())
                    {
                        errorResponse.Details = new
                        {
                            Type = exception.GetType().Name,
                            Message = exception.Message,
                            StackTrace = exception.StackTrace
                        };
                    }
                    break;
            }

            var json = JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            await response.WriteAsync(json);
        }

        private bool IsDevelopment()
        {
            return Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";
        }
    }

    public class ErrorResponse
    {
        public string ErrorId { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public object? Details { get; set; }
    }

    // Custom exception types
    public class ValidationException : Exception
    {
        public Dictionary<string, string[]> Errors { get; }

        public ValidationException(Dictionary<string, string[]> errors) : base("Validation failed")
        {
            Errors = errors;
        }
    }

    public class NotFoundException : Exception
    {
        public NotFoundException(string message) : base(message) { }
        public NotFoundException(string entityName, object key)
            : base($"{entityName} with key '{key}' was not found") { }
    }

    public class UnauthorizedException : Exception
    {
        public UnauthorizedException(string message = "Authentication required") : base(message) { }
    }

    public class ForbiddenException : Exception
    {
        public ForbiddenException(string message = "Access forbidden") : base(message) { }
    }

    public class ConflictException : Exception
    {
        public ConflictException(string message) : base(message) { }
    }

    public class BusinessException : Exception
    {
        public BusinessException(string message) : base(message) { }
    }
}
