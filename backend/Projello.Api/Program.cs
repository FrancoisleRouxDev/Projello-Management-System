using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Projello.Api.Data;
using Projello.Api.Models;
using Projello.Api.Hubs;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentity<User, IdentityRole>(options => //congigures identity with custom user
{
    options.Password.RequireDigit = true;           // must have at least one number
    options.Password.RequiredLength = 8;            // minimum 8 characters
    options.Password.RequireLowercase = true;       
    options.Password.RequireUppercase = true;       
    options.Password.RequireNonAlphanumeric = false; // This fixes your error
})
.AddEntityFrameworkStores<AppDbContext>()// Stores users in our DB context
.AddDefaultTokenProviders();// Enables password reset, etc.

var jwtKey = builder.Configuration["Jwt:Key"] ?? "Your_Super_Secret_Key_At_Least_32_Chars";
builder.Services.AddAuthentication(options => {// Sets JWT as default auth scheme
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options => { // Validates incoming JWTs
    options.TokenValidationParameters = new TokenValidationParameters {
        ValidateIssuer = true,// Checks token issuer
        ValidateAudience = true,// Checks intended recipient
        ValidateLifetime = true,// Ensures not expired
        ValidateIssuerSigningKey = true, // Verifies signature
        ValidIssuer = builder.Configuration["Jwt:Issuer"],// From appsettings for flexibility
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)) // Secret key
    };

// This event handler allows the JWT token to be read from the query string for SignalR hub connections, which is necessary for authentication in real-time communication scenarios.
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) &&
                path.StartsWithSegments("/hubs/project-call"))
            {
                context.Token = accessToken;
            }
        
            return Task.CompletedTask;
        }

    };
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowElectron", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// NOTE: The line below registers the custom authorization service that will be used to check if users can join or interact with project call rooms.
builder.Services.AddSignalR();
builder.Services.Configure<WebRtcOptions>(
    builder.Configuration.GetSection(WebRtcOptions.SectionName));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowElectron");
app.UseAuthentication(); 
app.UseAuthorization();

// NOTE: The line below maps the SignalR hub for project calls, allowing clients to connect to it at the specified route.
app.MapHub<ProjectCallHub>("/hubs/project-call");

app.MapControllers();
app.Run();
