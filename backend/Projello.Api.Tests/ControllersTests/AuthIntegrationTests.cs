using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
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

        // ==================== ORIGINAL TESTS ====================

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

        // ==================== RECENTLY ADDED BRANCH COVERAGE TESTS ====================

        [Fact]
        public async Task Register_WithInvalidInviteCode_ReturnsBadRequest()
        {
            // Arrange
            var registerDto = new UserRegisterDto
            {
                FullName = "Invite Tester",
                Email = $"invite_fail_{Guid.NewGuid()}@test.com",
                Password = "Password123!",
                InviteCode = "INVALID-CODE-999" // Non-existent invite token branch
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/auth/register", registerDto);
            
            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var content = await response.Content.ReadAsStringAsync();
            Assert.Contains("Invalid invite code", content);
        }

        [Fact]
        public async Task GetCurrentUser_Authenticated_ReturnsProfileData()
        {
            // Arrange
            var email = $"me_{Guid.NewGuid()}@test.com";
            var password = "Password123!";
            await _client.PostAsJsonAsync("/api/auth/register", new UserRegisterDto { FullName = "Me Tester", Email = email, Password = password });
            
            var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = email, Password = password });
            var authData = await loginResponse.Content.ReadFromJsonAsync<LoginResponseData>();

            // Act
            using var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", authData!.Token);
            var response = await _client.SendAsync(request);

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            Assert.Contains(email, content);
            Assert.Contains("Me Tester", content);
        }

        [Fact]
        public async Task ChangePassword_WithValidCurrentPassword_Succeeds()
        {
            // Arrange
            var email = $"pwd_{Guid.NewGuid()}@test.com";
            var oldPassword = "OldPassword123!";
            var newPassword = "NewPassword123!";
            await _client.PostAsJsonAsync("/api/auth/register", new UserRegisterDto { FullName = "Password Changer", Email = email, Password = oldPassword });
            
            var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = email, Password = oldPassword });
            var authData = await loginResponse.Content.ReadFromJsonAsync<LoginResponseData>();

            // Act
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/change-password");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", authData!.Token);
            request.Content = JsonContent.Create(new ChangePasswordDto { CurrentPassword = oldPassword, NewPassword = newPassword });
            var response = await _client.SendAsync(request);

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            Assert.Contains("Password updated successfully", content);
        }

        [Fact]
        public async Task DeleteAccount_Authenticated_RemovesUserProfile()
        {
            // Arrange
            var email = $"delete_{Guid.NewGuid()}@test.com";
            var password = "Password123!";
            await _client.PostAsJsonAsync("/api/auth/register", new UserRegisterDto { FullName = "To Be Deleted", Email = email, Password = password });
            
            var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = email, Password = password });
            var authData = await loginResponse.Content.ReadFromJsonAsync<LoginResponseData>();

            // Act
            using var request = new HttpRequestMessage(HttpMethod.Delete, "/api/auth/delete-account");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", authData!.Token);
            var response = await _client.SendAsync(request);

            // Assert
            response.EnsureSuccessStatusCode();
            
            // Verify user data is scrubbed and can't log in anymore
            var retryLogin = await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = email, Password = password });
            Assert.Equal(HttpStatusCode.Unauthorized, retryLogin.StatusCode);
        }

        [Fact]
        public async Task Get2FAStatus_ExistingUser_ReturnsFalseInitially()
        {
            // Arrange
            var email = $"2fastatus_{Guid.NewGuid()}@test.com";
            await _client.PostAsJsonAsync("/api/auth/register", new UserRegisterDto { FullName = "2FA Status Check", Email = email, Password = "Password123!" });

            // Act
            var response = await _client.GetAsync($"/api/auth/2fa-status?email={email}");

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            Assert.Contains("false", content.ToLower());
        }

        [Fact]
        public async Task Generate2FASecret_MismatchedEmailClaim_ReturnsForbid()
        {
            // Arrange
            var emailA = $"userA_{Guid.NewGuid()}@test.com";
            await _client.PostAsJsonAsync("/api/auth/register", new UserRegisterDto { FullName = "User A", Email = emailA, Password = "Password123!" });
            var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = emailA, Password = "Password123!" });
            var authData = await loginResponse.Content.ReadFromJsonAsync<LoginResponseData>();

            // Act: Request 2FA secret generation for a different email context
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/generate-2fa-secret");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", authData!.Token);
            request.Content = JsonContent.Create(new Setup2FaDto { Email = "completely_different_email@test.com" });
            var response = await _client.SendAsync(request);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Disable2FA_AuthenticatedUser_TurnsOff2FA()
        {
            // Arrange
            var email = $"disable2fa_{Guid.NewGuid()}@test.com";
            await _client.PostAsJsonAsync("/api/auth/register", new UserRegisterDto { FullName = "Disable Tester", Email = email, Password = "Password123!" });
            var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = email, Password = "Password123!" });
            var authData = await loginResponse.Content.ReadFromJsonAsync<LoginResponseData>();

            // Act
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/disable-2fa");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", authData!.Token);
            var response = await _client.SendAsync(request);

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            Assert.Contains("2FA has been disabled", content);
        }

        [Fact]
        public async Task GenerateInviteCode_AsAuthorizedOwner_ReturnsInviteCode()
        {
            // Arrange: Set up a company first to make sure the logged-in owner belongs to a valid company profile
            var ownerEmail = $"owner_invite_{Guid.NewGuid()}@test.com";
            var password = "Password123!";
            await _client.PostAsJsonAsync("/api/auth/register-company", new UserRegisterDto { CompanyName = "Invite Corp", FullName = "Owner User", Email = ownerEmail, Password = password });

            var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = ownerEmail, Password = password });
            var authData = await loginResponse.Content.ReadFromJsonAsync<LoginResponseData>();

            // Act
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/generate-invite");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", authData!.Token);
            var response = await _client.SendAsync(request);

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            
            // camelCase response from API JSON serialization context
            Assert.Contains("inviteCode", content);
        }

        // ==================== NEW FINAL CORES PUSH (>60%) ====================

        [Fact]
        public async Task RegisterCompany_MissingCompanyName_ReturnsBadRequest()
        {
            // Arrange: Blank/whitespace CompanyName to trigger verification branch
            var registerDto = new UserRegisterDto
            {
                CompanyName = "   ", 
                FullName = "No Company Guy",
                Email = $"nocompany_{Guid.NewGuid()}@test.com",
                Password = "Password123!"
            };

            // Act
            var response = await _client.PostAsJsonAsync("/api/auth/register-company", registerDto);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var content = await response.Content.ReadAsStringAsync();
            Assert.Contains("company name is required", content.ToLower());
        }

        [Fact]
        public async Task ChangePassword_WithWrongCurrentPassword_ReturnsBadRequest()
        {
            // Arrange
            var email = $"wrongpwd_{Guid.NewGuid()}@test.com";
            var actualPassword = "CorrectPassword123!";
            var incorrectCurrentPassword = "TotallyWrongPassword123!";
            
            await _client.PostAsJsonAsync("/api/auth/register", new UserRegisterDto { FullName = "Password Typo User", Email = email, Password = actualPassword });
            
            var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new UserLoginDto { Email = email, Password = actualPassword });
            var authData = await loginResponse.Content.ReadFromJsonAsync<LoginResponseData>();

            // Act: Attempt change password using incorrect current password payload configuration
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/change-password");
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", authData!.Token);
            request.Content = JsonContent.Create(new ChangePasswordDto { CurrentPassword = incorrectCurrentPassword, NewPassword = "BrandNewPassword123!" });
            var response = await _client.SendAsync(request);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Get2FAStatus_NonExistentUser_ReturnsNotFound()
        {
            // Act: Request status configuration for an email that completely does not exist in Db Context
            var response = await _client.GetAsync("/api/auth/2fa-status?email=ghost_profile_does_not_exist@test.com");

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
    } // <-- Properly closes the class scope

    // ==================== DTO PAYLOAD RESPONSE CLASSES ====================

    public class LoginResponseData
    {
        public string Token { get; set; } = string.Empty;
        public string User { get; set; } = string.Empty;
        public bool Requires2FA { get; set; }
    }

    public class ChangePasswordDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class Setup2FaDto
    {
        public string Email { get; set; } = string.Empty;
    }
} // <-- Properly closes the namespace scope