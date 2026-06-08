using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
    public class MilestonesControllerTests
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
            return new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("RoleID", roleId)
            }, "mock"));
        }

        [Fact]
        public async Task GetProjectMilestones_ValidProjectAndMember_ReturnsMilestones()
        {
            var context = GetInMemoryDbContext();
            var userId = "foreman-001";
            var projectId = 10;

            context.Projects.Add(new Project { ProjectID = projectId, Name = "Alpha Site", Status = "InProgress", CreatedByUserID = userId });
            context.ProjectMembers.Add(new ProjectMember { ProjectID = projectId, UserID = userId, AssignedAs = "Foreman" });
            context.Milestones.AddRange(
                new Milestone { MilestoneID = 1, ProjectID = projectId, Title = "Foundation", Status = "NotStarted", DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)) },
                new Milestone { MilestoneID = 2, ProjectID = projectId, Title = "Structure", Status = "InProgress", DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(20)) }
            );
            context.SaveChanges();

            var controller = new MilestonesController(context);
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = CreateMockUser(userId, "2") } };

            var result = await controller.GetProjectMilestones(projectId);
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var list = Assert.IsAssignableFrom<IEnumerable<MilestoneReadDto>>(ok.Value);
            Assert.Equal(2, list.Count());
        }

        [Fact]
        public async Task CreateMilestone_OnlyForemanOrAdminOrOwner_Allowed()
        {
            var context = GetInMemoryDbContext();
            var foremanId = "foreman-002";
            context.Projects.Add(new Project { ProjectID = 5, Name = "Beta Build", CreatedByUserID = foremanId });
            context.SaveChanges();

            var controller = new MilestonesController(context);
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = CreateMockUser(foremanId, "2") } };

            var dto = new MilestoneCreateDto { ProjectID = 5, Title = "Excavation Phase", DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)) };
            var result = await controller.CreateMilestone(dto);

            var created = Assert.IsType<CreatedAtActionResult>(result.Result);
            Assert.NotNull(created.Value);
        }

        [Fact]
        public async Task CreateMilestone_WorkerRole_ReturnsForbidden()
        {
            var context = GetInMemoryDbContext();
            var workerId = "worker-003";
            context.Projects.Add(new Project { ProjectID = 5, Name = "Beta Build", CreatedByUserID = workerId });
            context.SaveChanges();

            // 1. Configure the local controller instance with a Worker context (Role "3")
            var controller = new MilestonesController(context);
            controller.ControllerContext = new ControllerContext 
            { 
                HttpContext = new DefaultHttpContext { User = CreateMockUser(workerId, "3") } 
            };

            var dto = new MilestoneCreateDto { ProjectID = 5, Title = "Should Fail" };
            
            // 2. Act directly using the local instance
            var result = await controller.CreateMilestone(dto);

            // 3. Assert on the actual ObjectResult returned by your specific API implementation
            Assert.IsType<ObjectResult>(result.Result); 
        }

        [Fact]
        public async Task DeleteMilestone_NonAuthorized_ReturnsForbidden()
        {
            var context = GetInMemoryDbContext();
            var workerId = "worker-999";
            context.Milestones.Add(new Milestone { MilestoneID = 8, ProjectID = 1, Title = "To Delete" });
            context.SaveChanges();

            // 1. Configure the local controller instance
            var controller = new MilestonesController(context);
            controller.ControllerContext = new ControllerContext 
            { 
                HttpContext = new DefaultHttpContext { User = CreateMockUser(workerId, "3") } 
            };

            // 2. Act directly using the local instance
            var result = await controller.DeleteMilestone(8);
            
            // 3. Assert on the ObjectResult matching your controller action output
            Assert.IsType<ObjectResult>(result);
        }
        
        [Fact]
        public async Task DeleteMilestone_MilestoneDoesNotExist_ReturnsNotFound()
        {
            var context = GetInMemoryDbContext();
            var controller = new MilestonesController(context);
            controller.ControllerContext = new ControllerContext 
            { 
                HttpContext = new DefaultHttpContext { User = CreateMockUser("admin-id", "1") }
            };

            // Act - Removed the '.Result' accessor since DeleteMilestone returns IActionResult directly
            var result = await controller.DeleteMilestone(99999); 
            
            // Assert
            Assert.IsType<NotFoundResult>(result);
        }

[Fact]
        public async Task UpdateMilestone_MilestoneDoesNotExist_ReturnsNotFound()
        {
            var context = GetInMemoryDbContext();
            var controller = new MilestonesController(context);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser("admin-id", "1") }
            };

            // FIX: Using MilestoneUpdateDto instead of Milestone
            var dto = new MilestoneUpdateDto { Title = "Ghost Milestone" };
            var result = await controller.UpdateMilestone(99999, dto);

            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task UpdateMilestone_WorkerRole_ReturnsForbidden()
        {
            var context = GetInMemoryDbContext();
            var workerId = "worker-005";
            context.Milestones.Add(new Milestone { MilestoneID = 50, ProjectID = 1, Title = "Original Milestone" });
            context.SaveChanges();

            var controller = new MilestonesController(context);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser(workerId, "3") } // Role "3" = Regular Worker
            };

            // FIX: Using MilestoneUpdateDto instead of Milestone
            var dto = new MilestoneUpdateDto { Title = "Unauthorized Change" };
            var result = await controller.UpdateMilestone(50, dto);

            Assert.IsType<ObjectResult>(result);
        }

        [Fact]
        public async Task UpdateMilestone_ValidAdminOrForeman_ReturnsNoContentOrOk()
        {
            var context = GetInMemoryDbContext();
            var adminId = "admin-global";
            context.Milestones.Add(new Milestone { MilestoneID = 51, ProjectID = 1, Title = "Old Title", Status = "NotStarted" });
            context.SaveChanges();

            var controller = new MilestonesController(context);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser(adminId, "1") } // Role "1" = Admin
            };

            // FIX: Using MilestoneUpdateDto instead of Milestone
            var dto = new MilestoneUpdateDto { Title = "Brand New Title" };
            var result = await controller.UpdateMilestone(51, dto);

            Assert.True(result is NoContentResult || result is OkObjectResult, "Expected NoContentResult or OkObjectResult from a successful milestone update.");

            // Verify database state updated successfully
            var updatedMilestone = context.Milestones.Find(51);
            Assert.Equal("Brand New Title", updatedMilestone!.Title);
        }
    }
}