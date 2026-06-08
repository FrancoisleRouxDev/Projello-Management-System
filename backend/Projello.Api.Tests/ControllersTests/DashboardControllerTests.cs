using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Projello.Api.Controllers;
using Projello.Api.Data;
using Projello.Api.DTOs;
using Projello.Api.Models;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;

namespace Projello.Api.Tests
{
    public class DashboardControllerTests
    {
        private AppDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        // --- FIX: Added companyId to the user claims so the controller can find it ---
        private ClaimsPrincipal CreateUser(string userId, string roleId, string companyId = "99")
        {
            return new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("RoleID", roleId),
                new Claim("CompanyId", companyId) // <-- This fixes the empty collections!
            }, "TestAuth"));
        }

        [Fact]
        public async Task GetDashboardOverview_Admin_ReturnsAggregatedData()
        {
            var context = GetInMemoryDbContext();
            var adminId = "admin-001";

            context.Projects.Add(new Project
            {
                ProjectID = 1,
                Name = "Test Project",
                Status = "In Progress",
                CreatedByUserID = "user",
                // FIX: Client CompanyID matches the mocked user's CompanyID (99)
                Client = new Client { CompanyID = 99, Name = "Test Client" }
            });

            context.SaveChanges();

            var controller = new DashboardController(context);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateUser(adminId, "1", "99") }
            };

            var result = await controller.GetDashboardOverview();
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var dto = Assert.IsType<DashboardOverviewDto>(ok.Value);

            Assert.NotEmpty(dto.ActiveProjects);
        }

        [Fact]
        public async Task GetDashboardOverview_NonAdmin_FiltersByMembership()
        {
            var context = GetInMemoryDbContext();
            var userId = "foreman-42";

            context.Projects.AddRange(
                new Project 
                { 
                    ProjectID = 10, 
                    Name = "My Project", 
                    Status = "In Progress", 
                    CreatedByUserID = userId,
                    // FIX: Linked to Client with matching CompanyID (99)
                    Client = new Client { CompanyID = 99, Name = "Test Client" } 
                },
                new Project 
                { 
                    ProjectID = 11, 
                    Name = "Other Project", 
                    Status = "In Progress", 
                    CreatedByUserID = userId,
                    Client = new Client { CompanyID = 99, Name = "Test Client" } 
                }
            );
            
            context.ProjectMembers.Add(new ProjectMember { ProjectID = 10, UserID = userId, AssignedAs = "Worker" });
            
            context.SaveChanges();

            var controller = new DashboardController(context);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateUser(userId, "2", "99") }
            };

            var result = await controller.GetDashboardOverview();
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var dto = Assert.IsType<DashboardOverviewDto>(ok.Value);

            Assert.Single(dto.ActiveProjects);
            Assert.Equal("My Project", dto.ActiveProjects.First().Name);
        }

        [Fact]
        public async Task GetDashboardOverview_NonAdminWithNoCompany_ReturnsEmptyCollections()
        {
            var context = GetInMemoryDbContext();
            var userId = "lonely-user";

            var controller = new DashboardController(context);
            controller.ControllerContext = new ControllerContext
            {
                // Role 3 (Worker) but passing null/empty string for companyId claim
                HttpContext = new DefaultHttpContext { User = CreateUser(userId, "3", "") }
            };

            var result = await controller.GetDashboardOverview();
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var dto = Assert.IsType<DashboardOverviewDto>(ok.Value);

            // Verifies that the empty scoping conditions evaluate smoothly
            Assert.Empty(dto.ActiveProjects);
        }
    }
}