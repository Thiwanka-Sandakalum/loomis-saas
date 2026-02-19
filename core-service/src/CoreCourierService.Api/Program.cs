using CoreCourierService.Api.Middleware;
using CoreCourierService.Api.Services;
using CoreCourierService.Core.Interfaces;
using CoreCourierService.Infrastructure.Configuration;
using CoreCourierService.Infrastructure.Context;
using CoreCourierService.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;

var builder = WebApplication.CreateBuilder(args);

// Configure MongoDB settings
builder.Services.Configure<MongoDbSettings>(
    builder.Configuration.GetSection("MongoDbSettings"));

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
builder.Services.AddScoped<TenantService>();
builder.Services.AddScoped<ShipmentService>();
builder.Services.AddScoped<TenantUserService>();
builder.Services.AddScoped<ShipmentEventService>();
builder.Services.AddScoped<RateService>();
builder.Services.AddScoped<PaymentService>();
builder.Services.AddScoped<ComplaintService>();
builder.Services.AddScoped<SessionService>();
builder.Services.AddScoped<TelegramChatService>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddHttpClient<ITelegramIntegrationService, TelegramIntegrationService>();
builder.Services.AddHttpClient<ITelegramWebhookHandler, TelegramWebhookHandler>();

// Register caching and utilities
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<ICacheService, CacheService>();
builder.Services.AddHttpContextAccessor();


// Add Authentication Services (custom, as in Startup.cs)
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
    .AddJwtBearer(options =>
    {
        options.Authority = "https://dev-dtn8wjllia6xrmrl.us.auth0.com/";
        options.Audience = "https://loomis-main-srv/";
    });

builder.Services.AddMvc(options =>
{
    options.EnableEndpointRouting = false;
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:4200", "http://localhost:4201", "http://localhost:3000")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()
              .WithExposedHeaders("X-Correlation-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset");
    });
});


var app = builder.Build();


// Configure middleware pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/Home/Error");
}

app.UseStaticFiles();

app.UseCors();

// Enable authentication middleware
app.UseAuthentication();

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
