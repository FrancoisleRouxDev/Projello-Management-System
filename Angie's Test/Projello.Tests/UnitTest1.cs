using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Projello.Api.Controllers;
using Projello.Api.Data;
using Projello.Api.DTOs;
using Projello.Api.Models;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace Projello.Tests
{
    public class UnitTests
    {
        private AppDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            
            return new AppDbContext(options);
        }

        private void SeedMockDataWorkspace(AppDbContext context, string targetUserId)
        {
            var company = new Company { CompanyID = 1, Name = "BuildCorp Enterprise", CreatedAt = DateTime.UtcNow };
            context.Companies.Add(company);

            var project = new Project 
            { 
                ProjectID = 10, 
                Name = "Site Upgrade Alpha", 
                Status = "Planning", 
                ClientID = 5, 
                CreatedAt = DateTime.UtcNow 
            };
            context.Projects.Add(project);

            var milestone = new Milestone 
            { 
                MilestoneID = 1, 
                ProjectID = 10, 
                Title = "Groundwork Phase", 
                Status = "NotStarted", 
                CreatedAt = DateTime.UtcNow 
            };
            context.Milestones.Add(milestone);

            var membership = new ProjectMember 
            { 
                ProjectID = 10, 
                UserID = targetUserId, 
                AssignedAs = "Foreman" 
            };
            context.ProjectMembers.Add(membership);

            context.SaveChanges();
        }

        [Fact]
        public async Task CreateTask_WithValidData_ReturnsCreated()
        {
            var context = GetInMemoryDbContext();
            string testAdminId = "admin-user-id";
            SeedMockDataWorkspace(context, testAdminId);
            
            var controller = new TasksController(context);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, testAdminId),
                new Claim("RoleID", "1")
            }, "mock"));

            controller.ControllerContext = new ControllerContext()
            {
                HttpContext = new DefaultHttpContext() { User = user }
            };

            var dto = new TaskCreateDto
            {
                MilestoneID = 1,
                Title = "Test Task",
                Description = "Testing the creation logic",
                DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
                Priority = "High"
            };

            var result = await controller.CreateTask(dto);

            var actionResult = Assert.IsType<ActionResult<TaskReadDto>>(result);
            var createdAtActionResult = Assert.IsType<CreatedAtActionResult>(actionResult.Result);
            
            Assert.NotNull(createdAtActionResult.Value);
            var readDto = Assert.IsType<TaskReadDto>(createdAtActionResult.Value);
            Assert.Equal("Test Task", readDto.Title);
        }

        [Fact]
        public async Task CreateTask_WithWorkerRole_ReturnsForbid()
        {
            var context = GetInMemoryDbContext();
            string testWorkerId = "worker-id";
            SeedMockDataWorkspace(context, testWorkerId);
            
            var membership = context.ProjectMembers.FirstOrDefault(pm => pm.UserID == testWorkerId);
            if (membership != null) context.ProjectMembers.Remove(membership);
            context.SaveChanges();

            var controller = new TasksController(context);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, testWorkerId),
                new Claim("RoleID", "3")
            }, "mock"));

            controller.ControllerContext = new ControllerContext()
            {
                HttpContext = new DefaultHttpContext() { User = user }
            };

            var dto = new TaskCreateDto { Title = "Unauthorized Task", MilestoneID = 1 };

            var result = await controller.CreateTask(dto);

            Assert.IsType<ForbidResult>(result.Result);
        }

        [Fact]
        public async Task CreateTask_WithEmptyTitle_ReturnsCreated_BecauseNoValidationExists()
        {
            var context = GetInMemoryDbContext();
            string testAdminId = "admin-1";
            SeedMockDataWorkspace(context, testAdminId);
            
            var controller = new TasksController(context);
            
            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] {
                new Claim(ClaimTypes.NameIdentifier, testAdminId),
                new Claim("RoleID", "1")
            }, "mock"));
            controller.ControllerContext = new ControllerContext() { HttpContext = new DefaultHttpContext() { User = user } };

            var dto = new TaskCreateDto 
            { 
                MilestoneID = 1,
                Title = "   ", 
                DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1))
            };

            var result = await controller.CreateTask(dto);

            var actionResult = Assert.IsType<ActionResult<TaskReadDto>>(result);
            Assert.IsType<CreatedAtActionResult>(actionResult.Result);
        }

        [Fact]
        public async Task CreateTask_WithInvalidMilestone_ReturnsCreated_BecauseNoValidationExists()
        {
            var context = GetInMemoryDbContext(); 
            string testAdminId = "admin-1";
            SeedMockDataWorkspace(context, testAdminId);
            
            var controller = new TasksController(context);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] {
                new Claim(ClaimTypes.NameIdentifier, testAdminId),
                new Claim("RoleID", "1")
            }, "mock"));
            controller.ControllerContext = new ControllerContext() { HttpContext = new DefaultHttpContext() { User = user } };

            var dto = new TaskCreateDto 
            { 
                MilestoneID = 999, 
                Title = "Valid Title" 
            };

            var result = await controller.CreateTask(dto);

            var actionResult = Assert.IsType<ActionResult<TaskReadDto>>(result);
            Assert.IsType<CreatedAtActionResult>(actionResult.Result);
        }

        [Fact]
        public async Task GetMyTasks_OnlyReturnsTasksAssignedToTheRequestingUser()
        {
            var context = GetInMemoryDbContext();
            string targetUser = "foreman-alpha";
            SeedMockDataWorkspace(context, targetUser);

            var task1 = new TaskItem { TaskID = 100, MilestoneID = 1, Title = "Pour Cement", AssignedToUserID = targetUser, Status = "InProgress", Priority = "High" };
            var task2 = new TaskItem { TaskID = 200, MilestoneID = 1, Title = "Paint Walls", AssignedToUserID = "external-worker-id", Status = "NotStarted", Priority = "Low" };
            
            context.Tasks.AddRange(task1, task2);
            context.SaveChanges();

            var controller = new TasksController(context);
            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] {
                new Claim(ClaimTypes.NameIdentifier, targetUser),
                new Claim("RoleID", "2")
            }, "mock"));
            controller.ControllerContext = new ControllerContext() { HttpContext = new DefaultHttpContext() { User = user } };

            var result = await controller.GetMyTasks();

            var actionResult = Assert.IsType<ActionResult<IEnumerable<TaskReadDto>>>(result);
            var okObjectResult = Assert.IsType<OkObjectResult>(actionResult.Result);
            var items = Assert.IsAssignableFrom<IEnumerable<TaskReadDto>>(okObjectResult.Value);
            
            Assert.Single(items);
            Assert.Equal("Pour Cement", items.First().Title);
        }

        [Fact]
        public async Task GetTasksByMilestone_WithInvalidId_ReturnsNotFound()
        {
            var context = GetInMemoryDbContext();
            var controller = new TasksController(context);

            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[] {
                new Claim(ClaimTypes.NameIdentifier, "generic-user"),
                new Claim("RoleID", "1")
            }, "mock"));
            controller.ControllerContext = new ControllerContext() { HttpContext = new DefaultHttpContext() { User = user } };

            var result = await controller.GetTasksByMilestone(404);

            var actionResult = Assert.IsType<ActionResult<IEnumerable<TaskReadDto>>>(result);
            Assert.IsType<NotFoundResult>(actionResult.Result);
        }
    }
}