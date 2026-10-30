using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Projello.Api.DTOs;
using Xunit;

namespace Projello.Api.Tests.Integration
{
    public class TightRateLimitFactory : TestApiFactory
    {
        protected override Dictionary<string, string?> ExtraSettings => new()
        {
            ["RateLimiting:Auth:PermitLimit"] = "3",
            ["RateLimiting:Auth:WindowSeconds"] = "60"
        };
    }

    public class LockoutTests : IClassFixture<TestApiFactory>
    {
        private readonly HttpClient _client;

        public LockoutTests(TestApiFactory factory) => _client = factory.CreateClient();

        [Fact]
        public async Task Login_FiveBadPasswords_LocksAccountEvenForCorrectPassword()
        {
            var email = $"lockout_{Guid.NewGuid()}@test.com";
            const string password = "Password123!";
            await _client.PostAsJsonAsync("/api/auth/register",
                new UserRegisterDto { FullName = "Lockout", Email = email, Password = password });

            for (var i = 1; i <= 4; i++)
            {
                var bad = await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = email, Password = "wrong-password" });
                Assert.Equal(HttpStatusCode.Unauthorized, bad.StatusCode);
            }

            // The 5th failure trips the lockout.
            var fifth = await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = email, Password = "wrong-password" });
            Assert.Equal(HttpStatusCode.Locked, fifth.StatusCode);

            var correct = await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = email, Password = password });
            Assert.Equal(HttpStatusCode.Locked, correct.StatusCode);
            Assert.DoesNotContain("Token", await correct.Content.ReadAsStringAsync());
        }

        [Fact]
        public async Task Login_SuccessResetsFailureCount()
        {
            var email = $"reset_{Guid.NewGuid()}@test.com";
            const string password = "Password123!";
            await _client.PostAsJsonAsync("/api/auth/register",
                new UserRegisterDto { FullName = "Reset", Email = email, Password = password });

            for (var i = 0; i < 4; i++)
                await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = email, Password = "wrong-password" });

            var ok = await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = email, Password = password });
            Assert.Equal(HttpStatusCode.OK, ok.StatusCode);

            // Counter was reset, so four more failures still don't lock.
            for (var i = 0; i < 4; i++)
            {
                var bad = await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = email, Password = "wrong-password" });
                Assert.Equal(HttpStatusCode.Unauthorized, bad.StatusCode);
            }
        }

        [Fact]
        public async Task Verify2FA_FiveBadCodes_LocksAccount()
        {
            var email = $"lock2fa_{Guid.NewGuid()}@test.com";
            const string password = "Password123!";
            await _client.PostAsJsonAsync("/api/auth/register",
                new UserRegisterDto { FullName = "Lock 2FA", Email = email, Password = password });
            var login = await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = email, Password = password });
            var token = (await login.Content.ReadFromJsonAsync<LoginResponseData>())!.Token;

            // Enable 2FA properly so verify-2fa takes the normal (non-setup) path.
            using var setup = new HttpRequestMessage(HttpMethod.Post, "/api/auth/generate-2fa-secret");
            setup.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            setup.Content = JsonContent.Create(new Setup2FaDto { Email = email });
            var secret = (await (await _client.SendAsync(setup)).Content.ReadFromJsonAsync<System.Text.Json.JsonElement>())
                .GetProperty("secretKey").GetString()!;
            var totp = new OtpNet.Totp(OtpNet.Base32Encoding.ToBytes(secret));
            var activate = await _client.PostAsJsonAsync("/api/auth/verify-2fa",
                new Verify2FaDto { Email = email, Code = totp.ComputeTotp() });
            Assert.Equal(HttpStatusCode.OK, activate.StatusCode);

            HttpResponseMessage? last = null;
            for (var i = 0; i < 5; i++)
                last = await _client.PostAsJsonAsync("/api/auth/verify-2fa", new Verify2FaDto { Email = email, Code = "000000" });
            Assert.Equal(HttpStatusCode.Locked, last!.StatusCode);

            // Even a valid code is refused while locked.
            var valid = await _client.PostAsJsonAsync("/api/auth/verify-2fa",
                new Verify2FaDto { Email = email, Code = totp.ComputeTotp() });
            Assert.Equal(HttpStatusCode.Locked, valid.StatusCode);
        }
    }

    public class RateLimitTests : IClassFixture<TightRateLimitFactory>
    {
        private readonly HttpClient _client;

        public RateLimitTests(TightRateLimitFactory factory) => _client = factory.CreateClient();

        [Fact]
        public async Task Login_ExceedingLimit_Returns429()
        {
            var body = new UserLoginDto { Email = "nobody@test.com", Password = "irrelevant" };

            for (var i = 0; i < 3; i++)
            {
                var allowed = await _client.PostAsJsonAsync("/api/auth/login", body);
                Assert.Equal(HttpStatusCode.Unauthorized, allowed.StatusCode);
            }

            var limited = await _client.PostAsJsonAsync("/api/auth/login", body);
            Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        }
    }
}
