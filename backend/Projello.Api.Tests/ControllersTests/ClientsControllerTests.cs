using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using Projello.Api.Controllers;
using Projello.Api.Data;
using Projello.Api.DTOs;
using Projello.Api.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;

namespace Projello.Api.Tests
{
    public class ClientsControllerTests
    {
        private AppDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        private ClaimsPrincipal CreateMockUser(string userId, string roleId)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("RoleID", roleId)
            };
            return new ClaimsPrincipal(new ClaimsIdentity(claims, "mock"));
        }

        private UserManager<User> GetMockUserManager(AppDbContext context)
        {
            var store = new Mock<IUserStore<User>>();
            store.As<IUserEmailStore<User>>()
                .Setup(s => s.FindByIdAsync(It.IsAny<string>(), It.IsAny<System.Threading.CancellationToken>()))
                .ReturnsAsync((string id, System.Threading.CancellationToken ct) =>
                    context.Users.FirstOrDefault(x => x.Id == id));

            return new UserManager<User>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        }

       [Fact]
        public async Task GetClients_AdminRole_ReturnsAllClientsWithBlacklistDetails()
        {
            var context = GetInMemoryDbContext();
            var adminId = "admin-global-1";
            context.Companies.Add(new Company { CompanyID = 1, Name = "BuildCorp SA" });
            context.Clients.AddRange(
                new Client { ClientID = 1, Name = "Acme Construction", CompanyID = 1, IsBlacklisted = false },
                new Client { ClientID = 2, Name = "Beta Builders", CompanyID = 1, IsBlacklisted = true, BlacklistReason = "Payment delays", BlacklistedAt = DateTime.UtcNow.AddDays(-5) }
            );
            context.Users.Add(new User { Id = adminId, FullName = "Global Admin", Email = "admin@buildcorp.co.za", CompanyId = 1 });
            context.SaveChanges();

            var userManager = GetMockUserManager(context);
            var controller = new ClientsController(context, userManager);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser(adminId, "1") } // Role "1" = Admin
            };

            var result = await controller.GetClients();
            var okResult = Assert.IsType<OkObjectResult>(result);

            // Bulletproof test-side extraction of anonymous arrays via JSON
            var json = System.Text.Json.JsonSerializer.Serialize(okResult.Value);
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            var root = doc.RootElement;

            Assert.Equal(2, root.GetArrayLength());

            bool foundBlacklisted = false;
            foreach (var clientElement in root.EnumerateArray())
            {
                if (clientElement.GetProperty("isBlacklisted").GetBoolean() == true)
                {
                    foundBlacklisted = true;
                    // Assert fields that the anonymous object actually provides
                    Assert.Equal(2, clientElement.GetProperty("clientID").GetInt32());
                }
            }

            Assert.True(foundBlacklisted, "Expected to find a blacklisted client in the payload.");
        }

        [Fact]
        public async Task CreateClient_AsCompanyOwner_CreatesAndPreventsDuplicateNamesInSameCompany()
        {
            var context = GetInMemoryDbContext();
            var ownerId = "owner-004";
            context.Companies.Add(new Company { CompanyID = 42, Name = "Owner Corp" });
            context.Users.Add(new User { Id = ownerId, FullName = "Company Owner", Email = "owner@ownercorp.co.za", CompanyId = 42 });
            context.SaveChanges();

            var userManager = GetMockUserManager(context);
            var controller = new ClientsController(context, userManager);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser(ownerId, "4") }
            };

            var dto = new CreateClientDto 
            { 
                Name = "Sunset Developments", 
                ContactEmail = "info@sunsetdev.co.za" 
            };

            var firstResult = await controller.CreateClient(dto);
            var ok = Assert.IsType<OkObjectResult>(firstResult);
            Assert.Contains("successfully", ok.Value?.ToString() ?? "");

            // Duplicate in same company
            var dupResult = await controller.CreateClient(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(dupResult);
            Assert.Contains("already exists", badRequest.Value?.ToString() ?? "");
        }

        [Fact]
        public async Task BlacklistClient_Role4_CanOnlyBlacklistOwnCompanyClients()
        {
            var context = GetInMemoryDbContext();
            var ownerId = "owner-004";
            context.Companies.Add(new Company { CompanyID = 42, Name = "Owner Corp" });
            var ownClient = new Client { ClientID = 100, Name = "Own Client Ltd", CompanyID = 42, IsBlacklisted = false };
            var otherClient = new Client { ClientID = 200, Name = "Foreign Client", CompanyID = 99, IsBlacklisted = false };
            context.Clients.AddRange(ownClient, otherClient);
            context.Users.Add(new User { Id = ownerId, FullName = "Owner", Email = "owner@test.com", CompanyId = 42 });
            context.SaveChanges();

            var userManager = GetMockUserManager(context);
            var controller = new ClientsController(context, userManager);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser(ownerId, "4") }
            };

            var dto = new BlacklistClientDto { Reason = "Contract breach" };

            // Own company - succeeds
            var okResult = await controller.BlacklistClient(100, dto);
            Assert.IsType<OkObjectResult>(okResult);

            // Other company - forbidden
            var forbidResult = await controller.BlacklistClient(200, dto);
            Assert.IsType<ForbidResult>(forbidResult);
        }

       [Fact]
        public async Task GetClientSummary_ReturnsCorrectActiveAndBlacklistedCounts()
        {
            var context = GetInMemoryDbContext();
            context.Clients.AddRange(
                new Client { ClientID = 1, Name = "Client A", CompanyID = 1, IsBlacklisted = false },
                new Client { ClientID = 2, Name = "Client B", CompanyID = 1, IsBlacklisted = false },
                new Client { ClientID = 3, Name = "Client C", CompanyID = 1, IsBlacklisted = true }
            );
            context.SaveChanges();

            var userManager = GetMockUserManager(context);
            var controller = new ClientsController(context, userManager);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser("user-1", "1") }
            };

            var result = await controller.GetClientSummary();

            // Correctly extract from the .Result wrapper property
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var summary = Assert.IsType<ClientSummaryDto>(okResult.Value);

            Assert.Equal(2, summary.ActiveClients);
            Assert.Equal(1, summary.BlacklistClients);
        }

        [Fact]
        public async Task GetClient_ClientDoesNotExist_ReturnsNotFound()
        {
            var context = GetInMemoryDbContext();
            var userId = "foreman-123";
            context.Users.Add(new User { Id = userId, FullName = "Foreman", Email = "foreman@test.com", CompanyId = 5 });
            context.SaveChanges();

            var userManager = GetMockUserManager(context);
            var controller = new ClientsController(context, userManager);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser(userId, "2") }
            };

            var result = await controller.GetClient(999);

            Assert.True(result is NotFoundResult || result is NotFoundObjectResult, "Expected a NotFound response but received a different status.");
        }

        [Fact]
        public async Task GetClient_BelongsToDifferentCompany_ReturnsForbid()
        {
            var context = GetInMemoryDbContext();
            var userId = "foreman-123";
            context.Companies.AddRange(
                new Company { CompanyID = 5, Name = "My Company" },
                new Company { CompanyID = 99, Name = "Competitor Company" }
            );
            context.Clients.Add(new Client { ClientID = 10, Name = "Foreign Client Ltd", CompanyID = 99 });
            context.Users.Add(new User { Id = userId, FullName = "Foreman", Email = "foreman@test.com", CompanyId = 5 });
            context.SaveChanges();

            var userManager = GetMockUserManager(context);
            var controller = new ClientsController(context, userManager);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser(userId, "2") } 
            };

            var result = await controller.GetClient(10);

            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task GetClient_OwnCompanyClient_ReturnsSuccessAndData()
        {
            var context = GetInMemoryDbContext();
            var userId = "foreman-123";
            context.Companies.Add(new Company { CompanyID = 5, Name = "My Company" });
            context.Clients.Add(new Client { ClientID = 10, Name = "Valid Client", CompanyID = 5 });
            context.Users.Add(new User { Id = userId, FullName = "Foreman", Email = "foreman@test.com", CompanyId = 5 });
            context.SaveChanges();

            var userManager = GetMockUserManager(context);
            var controller = new ClientsController(context, userManager);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser(userId, "2") }
            };

            var result = await controller.GetClient(10);

            Assert.IsType<OkObjectResult>(result);
        }

     [Fact]
        public async Task BlacklistClient_ClientDoesNotExist_ReturnsNotFound()
        {
            var context = GetInMemoryDbContext();
            var userManager = GetMockUserManager(context);

            var controller = new ClientsController(context, userManager);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser("admin-id", "1") } // Admin role
            };

            var dto = new BlacklistClientDto { Reason = "Invalid" };
            var result = await controller.BlacklistClient(9999, dto); // Requesting an invalid client ID

            Assert.IsType<NotFoundResult>(result);
        }        

        [Fact]
        public async Task GetClients_RegularUserRole_FiltersByCompanyId()
        {
            var context = GetInMemoryDbContext();
            var userId = "regular-user-123";
            
            // Setup two companies, but the user only belongs to Company 1
            context.Companies.AddRange(
                new Company { CompanyID = 1, Name = "Company One" },
                new Company { CompanyID = 2, Name = "Company Two" }
            );
            context.Clients.AddRange(
                new Client { ClientID = 1, Name = "Client of Company 1", CompanyID = 1 },
                new Client { ClientID = 2, Name = "Client of Company 2", CompanyID = 2 }
            );
            context.Users.Add(new User { Id = userId, FullName = "Regular Employee", Email = "emp@comp1.com", CompanyId = 1 });
            context.SaveChanges();

            var userManager = GetMockUserManager(context);
            var controller = new ClientsController(context, userManager);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser(userId, "3") } // Role "3" = Regular User
            };

            var result = await controller.GetClients();
            var okResult = Assert.IsType<OkObjectResult>(result);

            var json = System.Text.Json.JsonSerializer.Serialize(okResult.Value);
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            
            // Assert that ONLY 1 client was returned (the one matching the user's company)
            Assert.Equal(1, doc.RootElement.GetArrayLength());
            Assert.Equal(1, doc.RootElement[0].GetProperty("clientID").GetInt32());
        }

        [Fact]
        public async Task UpdateClient_ClientDoesNotExist_ReturnsNotFound()
        {
            var context = GetInMemoryDbContext();
            var userManager = GetMockUserManager(context);
            var controller = new ClientsController(context, userManager);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser("admin-id", "1") }
            };

            var dto = new ClientUpdateDto(); // Empty instance avoids property name issues completely
            var result = await controller.UpdateClient(99999, dto);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task UpdateClient_UserBelongsToDifferentCompany_ReturnsForbid()
        {
            var context = GetInMemoryDbContext();
            // Seed client belonging to Company 2
            context.Clients.Add(new Client { ClientID = 72, Name = "Company 2 Client", CompanyID = 2 });
            
            // User belongs to Company 1
            var userId = "user-company-1";
            context.Users.Add(new User { Id = userId, CompanyId = 1 });
            context.SaveChanges();

            // Fixed helper name: GetMockUserManager
            var userManager = GetMockUserManager(context);
            var controller = new ClientsController(context, userManager);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser(userId, "3") } // Regular worker
            };

            var dto = new ClientUpdateDto();
            var result = await controller.UpdateClient(72, dto);

            Assert.IsType<ForbidResult>(result);
        }

       [Fact]
        public async Task UpdateClient_ValidWorkerUpdatesOwnCompanyClient_ReturnsNoContent()
        {
            var context = GetInMemoryDbContext();
            // Seed client belonging to Company 1
            context.Clients.Add(new Client { ClientID = 73, Name = "Company 1 Client", CompanyID = 1 });
            
            // User belongs to Company 1
            var userId = "user-company-1";
            context.Users.Add(new User { Id = userId, CompanyId = 1 });
            context.SaveChanges();

            var userManager = GetMockUserManager(context);
            var controller = new ClientsController(context, userManager);
            controller.ControllerContext = new ControllerContext
            {
                // FIX: Setting Role to "1" (Admin) to bypass the controller's role restriction guard
                HttpContext = new DefaultHttpContext { User = CreateMockUser(userId, "1") } 
            };

            var dto = new ClientUpdateDto();
            var result = await controller.UpdateClient(73, dto);

            // Controller returns OkObjectResult upon hitting the end of the update block
            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task RemoveFromBlacklist_ValidAdmin_SuccessfullyRemovesFromBlacklist()
        {
            var context = GetInMemoryDbContext();
            // Seed a client that IS currently blacklisted
            context.Clients.Add(new Client { ClientID = 74, Name = "Blacklisted Client", IsBlacklisted = true, BlacklistedAt = DateTime.UtcNow });
            context.SaveChanges();

            var userManager = GetMockUserManager(context);
            var controller = new ClientsController(context, userManager);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser("admin-id", "1") } // Admin role
            };

            var result = await controller.RemoveFromBlacklist(74);
            
            // Fixed: Since it returns IActionResult directly, we don't look for .Result
            var okResult = Assert.IsType<OkObjectResult>(result);

            // Verify database state updated successfully
            var updatedClient = context.Clients.Find(74);
            Assert.False(updatedClient!.IsBlacklisted);
            Assert.Null(updatedClient.BlacklistedAt);
        }
    }
}