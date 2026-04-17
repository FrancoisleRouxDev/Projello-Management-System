using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Projello.Api.Data;
using Projello.Api.Models;
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

app.MapControllers();
app.Run();