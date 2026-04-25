using CoreCourierService.Api.Middleware;
using CoreCourierService.Api.Services;
using CoreCourierService.Api.Configuration;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using CoreCourierService.Infrastructure.Context;
using CoreCourierService.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;

DotEnvLoader.LoadFromCurrentPath();

var builder = WebApplication.CreateBuilder(args);

// Register MongoDB class maps for IntegrationConfig and its subclasses
MongoDB.Bson.Serialization.BsonClassMap.RegisterClassMap<CoreCourierService.Core.Entities.IntegrationConfig>(cm =>
{
    cm.AutoMap();
    cm.SetIsRootClass(true);
});
MongoDB.Bson.Serialization.BsonClassMap.RegisterClassMap<CoreCourierService.Core.Entities.TelegramConfig>(cm =>
{
    cm.AutoMap();
    cm.SetDiscriminator("TelegramConfig");
});
MongoDB.Bson.Serialization.BsonClassMap.RegisterClassMap<CoreCourierService.Core.Entities.WhatsAppConfig>(cm =>
{
    cm.AutoMap();
    cm.SetDiscriminator("WhatsAppConfig");
});

// Configure MongoDB settings
builder.Services.Configure<MongoDbSettings>(
    builder.Configuration.GetSection("MongoDbSettings"));

// Register singleton MongoClient to prevent connection pool exhaustion
builder.Services.AddSingleton<MongoDB.Driver.IMongoClient>(sp =>
{
    var settings = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<MongoDbSettings>>().Value;
    return new MongoDB.Driver.MongoClient(settings.ConnectionString);
});

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Register tenant context (scoped per request)
builder.Services.AddScoped<ITenantContext, TenantContext>();

// Register repositories
builder.Services.AddScoped<ITenantRepository, TenantRepository>();
builder.Services.AddScoped<IShipmentRepository, ShipmentRepository>();
builder.Services.AddScoped<ITenantUserRepository, TenantUserRepository>();
builder.Services.AddScoped<IShipmentEventRepository, ShipmentEventRepository>();
builder.Services.AddScoped<IRateRepository, RateRepository>();
builder.Services.AddScoped<IPaymentRepository, PaymentRepository>();
builder.Services.AddScoped<IComplaintRepository, ComplaintRepository>();
builder.Services.AddScoped<ITenantIntegrationRepository, TenantIntegrationRepository>();
builder.Services.AddScoped<ISessionRepository, SessionRepository>();
builder.Services.AddScoped<ITelegramChatRepository, TelegramChatRepository>();
builder.Services.AddScoped<ITelegramMessageRepository, TelegramMessageRepository>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();


// Register services
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IShipmentService, ShipmentService>();
builder.Services.AddScoped<ITenantUserService, TenantUserService>();
builder.Services.AddScoped<IShipmentEventService, ShipmentEventService>();
builder.Services.AddScoped<IRateService, RateService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IComplaintService, ComplaintService>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<ITelegramChatService, TelegramChatService>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddSingleton<TelegramWebhookQueue>();
builder.Services.AddSingleton<ITelegramWebhookQueue>(sp => sp.GetRequiredService<TelegramWebhookQueue>());
builder.Services.AddHostedService<TelegramWebhookBackgroundService>();
builder.Services.AddHttpClient<ITelegramIntegrationService, TelegramIntegrationService>();
builder.Services.AddHttpClient<ITelegramWebhookHandler, TelegramWebhookHandler>();

// Register caching and utilities
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ICacheService, CacheService>();
builder.Services.AddHttpContextAccessor();


// Add Authentication Services
var auth0Domain = builder.Configuration["Auth0:Domain"]
    ?? throw new InvalidOperationException("Auth0:Domain configuration is required");
var auth0Audience = builder.Configuration["Auth0:Audience"]
    ?? throw new InvalidOperationException("Auth0:Audience configuration is required");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
    .AddJwtBearer(options =>
    {
        options.Authority = auth0Domain;
        options.Audience = auth0Audience;
    });

builder.Services.AddAuthorization(options =>
{
    // Require the Role context item to equal "admin" (set by TenantResolverMiddleware)
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireAuthenticatedUser()
              .RequireAssertion(ctx =>
              {
                  var httpCtx = ctx.Resource as Microsoft.AspNetCore.Http.HttpContext;
                  return httpCtx?.Items["Role"]?.ToString() == CoreCourierService.Core.ServiceConstants.UserRoles.Admin;
              }));
});

builder.Services.AddMvc(options =>
{
    options.EnableEndpointRouting = false;
});

var allowedOrigins = builder.Configuration
    .GetSection("AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .WithExposedHeaders("X-Correlation-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset");
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .WithExposedHeaders("X-Correlation-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset");
        }
    });
});


var app = builder.Build();

// Configure middleware pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    // Swagger only in development — avoids exposing API schema in production
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "CoreCourierService API V1");
        c.RoutePrefix = "swagger";
    });
}

// Add global exception middleware for structured error responses
app.UseMiddleware<CoreCourierService.Api.Middleware.GlobalExceptionMiddleware>();

// Correlation ID must be first so it's available for all downstream logging
app.UseMiddleware<CoreCourierService.Api.Middleware.CorrelationIdMiddleware>();

app.UseStaticFiles();

app.UseCors();

// Enable authentication & authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// Custom middleware (order matters!)
app.UseMiddleware<TenantResolverMiddleware>();
app.UseMiddleware<RateLimitingMiddleware>();

// Use MVC routing (Startup.cs style)
app.UseMvc(routes =>
{
    routes.MapRoute(
        name: "default",
        template: "{controller=Home}/{action=Index}/{id?}");
});

// Listen on the port defined by the PORT environment variable (Cloud Run requirement)
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
app.Urls.Add($"http://0.0.0.0:{port}");
app.Run();
