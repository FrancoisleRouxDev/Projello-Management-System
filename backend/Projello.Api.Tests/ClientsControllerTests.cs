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

namespace Projello.Tests
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
                HttpContext = new DefaultHttpContext { User = CreateMockUser(adminId, "1") }
            };

            var result = await controller.GetClients();
            var okResult = Assert.IsType<OkObjectResult>(result);
            var list = Assert.IsAssignableFrom<IEnumerable<ClientBlacklistStatusDto>>(okResult.Value);
            
            Assert.Equal(2, list.Count());
            var blacklisted = list.First(c => c.IsBlacklisted);
            Assert.Equal("Payment delays", blacklisted.BlacklistReason);
            Assert.NotNull(blacklisted.BlacklistedAt);
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
            Assert.Contains("successfully", ok.Value.ToString() ?? "");

            // Duplicate in same company
            var dupResult = await controller.CreateClient(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(dupResult);
            Assert.Contains("already exists", badRequest.Value.ToString() ?? "");
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
            var userId = "foreman-123";
            context.Companies.Add(new Company { CompanyID = 5, Name = "Test Co" });
            context.Clients.AddRange(
                new Client { ClientID = 1, Name = "Active One", CompanyID = 5, IsBlacklisted = false },
                new Client { ClientID = 2, Name = "Black Two", CompanyID = 5, IsBlacklisted = true },
                new Client { ClientID = 3, Name = "Active Three", CompanyID = 5, IsBlacklisted = false }
            );
            context.Users.Add(new User { Id = userId, FullName = "Foreman", Email = "foreman@test.com", CompanyId = 5 });
            context.SaveChanges();

            var userManager = GetMockUserManager(context);
            var controller = new ClientsController(context, userManager);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser(userId, "2") }
            };

            var result = await controller.GetClientSummary();
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var summary = Assert.IsType<ClientSummaryDto>(okResult.Value);

            Assert.Equal(2, summary.ActiveClients);
            Assert.Equal(1, summary.BlacklistClients);
        }
    }
}