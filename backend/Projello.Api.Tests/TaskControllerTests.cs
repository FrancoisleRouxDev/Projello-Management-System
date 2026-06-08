using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using Projello.Api.Controllers;
using Projello.Api.Data;
using Projello.Api.DTOs;
using Projello.Api.Models;
using Xunit;

namespace Projello.Api.Tests
{
    public class TasksControllerTests
    {
        private static AppDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        private static ControllerContext CreateControllerContext(string userId, string roleId)
        {
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("RoleID", roleId)
            }, "test-auth"));

            return new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }

        [Fact]
        public async Task GetMyTasks_ReturnsOnlyTasksForCurrentUser()
        {
            using var context = CreateContext();

            // Seed minimal data
            var seededUser = new User
            {
                Id = "user-1",
                FullName = "Test User",
                UserName = "user-1@test.local",
                Email = "user-1@test.local"
            };
            context.Users.Add(seededUser);

            context.Projects.Add(new Project
            {
                ProjectID = 1,
                Name = "Project A",
                ClientID = 1,
                Status = "Planning",
                CreatedAt = DateTime.UtcNow,
                CreatedByUserID = "user-1"
            });

            context.Milestones.Add(new Milestone
            {
                MilestoneID = 10,
                ProjectID = 1,
                Title = "Milestone A",
                Status = "NotStarted",
                CreatedAt = DateTime.UtcNow
            });

            context.Tasks.AddRange(
                new TaskItem
                {
                    TaskID = 100,
                    MilestoneID = 10,
                    Title = "Mine",
                    AssignedToUserID = "user-1",
                    Status = Status.NotStarted,
                    Priority = "High",
                    CreatedAt = DateTime.UtcNow
                },
                new TaskItem
                {
                    TaskID = 200,
                    MilestoneID = 10,
                    Title = "Not mine",
                    AssignedToUserID = "user-2",
                    Status = Status.NotStarted,
                    Priority = "Low",
                    CreatedAt = DateTime.UtcNow
                }
            );

            await context.SaveChangesAsync();

            // Create a mocked UserManager that will return the seeded admin user
            var storeMock = new Mock<IUserStore<User>>();
            var userManagerMock = new Mock<UserManager<User>>(
                storeMock.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            // Ensure FindByIdAsync returns the seeded user and UpdateAsync succeeds
            userManagerMock.Setup(m => m.FindByIdAsync("user-1")).ReturnsAsync(seededUser);
            userManagerMock.Setup(m => m.UpdateAsync(It.IsAny<User>())).ReturnsAsync(IdentityResult.Success);

            var controller = new TasksController(context)
            {
                ControllerContext = CreateControllerContext("user-1", "2")
            };

            var result = await controller.GetMyTasks();

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var items = Assert.IsAssignableFrom<IEnumerable<object>>(ok.Value); // TaskReadDto exists project; use that type if available

            Assert.Single(items);
            // If you have TaskReadDto accessible, replace the assertions below to cast and inspect Title
        }

       [Fact]
        public async Task GetTasksForProject_ReturnsTasksForProject()
        {
            using var context = CreateContext();

            // Seed minimal data
            var seededUser = new User
            {
                Id = "user-1",
                FullName = "Test User",
                UserName = "user-1@test.local",
                Email = "user-1@test.local"
            };
            context.Users.Add(seededUser);

            context.Projects.Add(new Project
            {
                ProjectID = 1,
                Name = "Project A",
                ClientID = 1,
                Status = "Planning",
                CreatedAt = DateTime.UtcNow,
                CreatedByUserID = "user-1"
            });

            context.Milestones.Add(new Milestone
            {
                MilestoneID = 10,
                ProjectID = 1,
                Title = "Milestone A",
                Status = "NotStarted",
                CreatedAt = DateTime.UtcNow
            });

            context.Tasks.AddRange(
                new TaskItem
                {
                    TaskID = 100,
                    MilestoneID = 10,
                    Title = "Mine",
                    AssignedToUserID = "user-1",
                    Status = Status.NotStarted,
                    Priority = "High",
                    CreatedAt = DateTime.UtcNow
                },
                new TaskItem
                {
                    TaskID = 200,
                    MilestoneID = 10,
                    Title = "Not mine",
                    AssignedToUserID = "user-2",
                    Status = Status.NotStarted,
                    Priority = "Low",
                    CreatedAt = DateTime.UtcNow
                }
            );

            await context.SaveChangesAsync();

            // Create a mocked UserManager that will return the seeded admin user
            var storeMock = new Mock<IUserStore<User>>();
            var userManagerMock = new Mock<UserManager<User>>(
                storeMock.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            userManagerMock.Setup(m => m.FindByIdAsync("user-1")).ReturnsAsync(seededUser);
            userManagerMock.Setup(m => m.UpdateAsync(It.IsAny<User>())).ReturnsAsync(IdentityResult.Success);

            var tasksController = new TasksController(context)
            {
                ControllerContext = CreateControllerContext("user-1", "1")
            };

            var result = await tasksController.GetTasksByProject(1);

            var ok = Assert.IsType<OkObjectResult>(result.Result);
            
            // FIX 1: Cast directly to the real DTO collection type shown in your logs
            var items = Assert.IsAssignableFrom<IEnumerable<TaskReadDto>>(ok.Value).ToList(); 

            // FIX 2: Expect 2 tasks instead of 1, because both belong to Project 1
            Assert.Equal(2, items.Count);
            
            // (Optional) Verify that the actual content inside the list matches what you expect
            Assert.Contains(items, t => t.AssignedToUserID == "user-1");
            Assert.Contains(items, t => t.AssignedToUserID == "user-2");
        }
    }
}