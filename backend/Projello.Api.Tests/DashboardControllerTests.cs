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

        private ClaimsPrincipal CreateUser(string userId, string roleId)
        {
            return new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("RoleID", roleId)
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
                Name = "Site A", 
                Status = "In Progress", 
                CreatedByUserID = adminId 
            });
            context.SaveChanges();

            var controller = new DashboardController(context);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateUser(adminId, "1") }
            };

            var result = await controller.GetDashboardOverview();
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var dto = Assert.IsType<DashboardDtos>(ok.Value);

            Assert.NotEmpty(dto.ActiveProjects);
        }

        [Fact]
        public async Task GetDashboardOverview_NonAdmin_FiltersByMembership()
        {
            var context = GetInMemoryDbContext();
            var userId = "foreman-42";

            context.Projects.AddRange(
                new Project { ProjectID = 10, Name = "My Project", Status = "In Progress" },
                new Project { ProjectID = 11, Name = "Other Project", Status = "In Progress" }
            );
            context.ProjectMembers.Add(new ProjectMember { ProjectID = 10, UserID = userId });
            context.SaveChanges();

            var controller = new DashboardController(context);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateUser(userId, "2") }
            };

            var result = await controller.GetDashboardOverview();
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var dto = Assert.IsType<DashboardDtos>(ok.Value);

            Assert.Single(dto.ActiveProjects);
            Assert.Equal("My Project", dto.ActiveProjects.First().Name);
        }
    }
}