using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Projello.Api.Data;

namespace Projello.Api.Tests
{
    // Boots the real API with a test-only JWT key and an in-memory database,
    // so no secrets or Postgres instance are needed.
    public class TestApiFactory : WebApplicationFactory<Program>
    {
        public const string TestJwtKey = "test-only-jwt-key-0123456789-abcdefghij-KLMNOP";

        private readonly string _dbName = Guid.NewGuid().ToString();

        // Subclasses override this to add or change configuration for a single fixture.
        protected virtual Dictionary<string, string?> ExtraSettings => new();

        // Generous default so tests sharing one (null) client IP don't trip the auth rate limiter.
        private static readonly Dictionary<string, string?> Defaults = new()
        {
            ["Jwt:Key"] = TestJwtKey,
            ["RateLimiting:Auth:PermitLimit"] = "1000"
        };

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                var settings = new Dictionary<string, string?>(Defaults);
                foreach (var kv in ExtraSettings) settings[kv.Key] = kv.Value;
                config.AddInMemoryCollection(settings);
            });

            builder.ConfigureServices(services =>
            {
                foreach (var d in services.Where(d =>
                    d.ServiceType == typeof(DbContextOptions<AppDbContext>) ||
                    d.ServiceType == typeof(IDbContextOptionsConfiguration<AppDbContext>) ||
                    d.ServiceType == typeof(DbContextOptions)).ToList())
                    services.Remove(d);

                services.AddDbContext<AppDbContext>(o => o.UseInMemoryDatabase(_dbName));
            });
        }
    }
}
