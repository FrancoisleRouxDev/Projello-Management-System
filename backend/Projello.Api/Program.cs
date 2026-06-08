using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Projello.Api.Data;
using Projello.Api.Models;
using Projello.Api.Hubs;
using System.Text;
using CloudinaryDotNet;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// === CRITICAL FIX FOR RENDER.COM ===
builder.WebHost.UseKestrel(options =>
{
    var port = Environment.GetEnvironmentVariable("PORT") ?? "5049";
    options.ListenAnyIP(int.Parse(port));
});
// =====================================

// Cloudinary configuration
builder.Services.Configure<CloudinarySettings>(
    builder.Configuration.GetSection("CloudinarySettings"));

builder.Services.AddSingleton(sp =>
{
    var settings = sp.GetRequiredService<IOptions<CloudinarySettings>>().Value;
    var account = new Account(
        settings.CloudName,
        settings.ApiKey,
        settings.ApiSecret);
    return new Cloudinary(account);
});

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Identity - using AddIdentityCore to prevent cookie auth overriding JWT
builder.Services.AddIdentityCore<User>(options => {
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 8;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// JWT
var jwtKey = builder.Configuration["Jwt:Key"] ?? "Projello@SuperSecret!Key#2026$Secure%";
builder.Services.AddAuthentication(options => {
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options => {
    options.UseSecurityTokenValidators = true; // Critical fix for IdentityModel 8.x
    options.TokenValidationParameters = new TokenValidationParameters {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.Zero
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            // SignalR sends token in query string
            var accessToken = context.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(accessToken))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// CORS - Allow localhost (dev) + your Render domain + Electron
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowApp", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
            origin.StartsWith("http://localhost") ||
            origin.StartsWith("https://localhost") ||
            origin == "https://projello-management-system.onrender.com" ||
            origin.StartsWith("app://") ||           // Common for Electron
            origin.StartsWith("file://")              // Sometimes used by Electron
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Swagger with Bearer Auth
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Projello API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Enter your JWT token (without 'Bearer' prefix)",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddSignalR();
builder.Services.Configure<WebRtcOptions>(
    builder.Configuration.GetSection(WebRtcOptions.SectionName));
builder.Services.AddSignalR().AddHubOptions<ProjectCallHub>(options =>
{
    options.EnableDetailedErrors = true;
});

var app = builder.Build();

// Fixed conditional redirect blocks to prevent routing layout failure loops on Dev environments
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("AllowApp");
app.UseAuthentication();

app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/callhub"))
    {
        var isAuth = context.User.Identity?.IsAuthenticated ?? false;
        var userId = context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                  ?? "No UserIdentifier";

        Console.WriteLine($"[SignalR] Authenticated: {isAuth}");
        Console.WriteLine($"[SignalR] UserIdentifier: {userId}");
    }
    await next();
});

app.UseAuthorization();
app.MapControllers();
app.MapHub<ProjectCallHub>("/callhub");
app.MapHub<TeamNotificationHub>("/teamnotificationHub");

app.Run();

public partial class Program { }