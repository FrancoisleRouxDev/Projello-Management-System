using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Projello.Api.DTOs;
using Xunit;

namespace Projello.Api.Tests.Integration
{
    // WebApplicationFactory boots your REAL API in the background
    public class AuthIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public AuthIntegrationTests(WebApplicationFactory<Program> factory)
        {
            // Creates a real HTTP client pointing at your background API
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task RegisterCompany_WithValidData_CreatesCompanyAndUser()
        {
            // Arrange: Generate a unique email so the test passes every time you run it
            var uniqueEmail = $"owner_{Guid.NewGuid()}@test.com";
            
            var registerDto = new UserRegisterDto
            {
                CompanyName = "Real Integration Corp",
                FullName = "Integration Boss",
                Email = uniqueEmail,
                Password = "Password123!"
            };

            // Act: Fire a REAL HTTP POST to your register-company endpoint
            var response = await _client.PostAsJsonAsync("/api/auth/register-company", registerDto);

            // Assert: Check that we got a 200 OK back
            response.EnsureSuccessStatusCode(); 
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var responseData = await response.Content.ReadAsStringAsync();
            Assert.Contains("Company registered successfully", responseData);
        }

        [Fact]
        public async Task Login_WithValidCredentials_ReturnsRealJwtToken()
        {
            // Arrange: 1. Create the user first so we know they exist in the DB
            var uniqueEmail = $"login_{Guid.NewGuid()}@test.com";
            var password = "SuperSecretPassword123!";
            
            var registerDto = new UserRegisterDto
            {
                FullName = "Login Tester",
                Email = uniqueEmail,
                Password = password
            };
            
            // Note: Using standard register here, not company register
            await _client.PostAsJsonAsync("/api/auth/register", registerDto);

            // 2. Prepare the Login payload
            var loginDto = new UserLoginDto
            {
                Email = uniqueEmail,
                Password = password
            };

            // Act: Fire a REAL HTTP POST to your login endpoint
            var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", loginDto);

            // Assert
            loginResponse.EnsureSuccessStatusCode();
            Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

            // Verify the JWT token is actually attached to the response
            var authData = await loginResponse.Content.ReadFromJsonAsync<LoginResponseData>();
            
            Assert.NotNull(authData);
            Assert.False(string.IsNullOrEmpty(authData.Token)); // Proves the JWT was generated!
            Assert.Equal("Login Tester", authData.User);        // Proves the user data came back!
            Assert.False(authData.Requires2FA);                 // Proves 2FA logic fired correctly
        }

        [Fact]
        public async Task Login_WithWrongPassword_ReturnsUnauthorized()
        {
            // Arrange
            var loginDto = new UserLoginDto
            {
                Email = "thisuserdoesnotexist@test.com",
                Password = "WrongPassword!"
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/auth/login", loginDto);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            var responseData = await response.Content.ReadAsStringAsync();
            Assert.Contains("Invalid credentials", responseData);
        }
    }

    // Helper class to catch the JSON response from your Login endpoint
    public class LoginResponseData
    {
        public string Token { get; set; } = string.Empty;
        public string User { get; set; } = string.Empty;
        public bool Requires2FA { get; set; }
    }
}