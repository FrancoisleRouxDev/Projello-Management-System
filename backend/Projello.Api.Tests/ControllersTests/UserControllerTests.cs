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
    public class UsersControllerTests
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

        // Simpler, completely reliable Mock UserManager that handles Find and Updates perfectly
        private static Mock<UserManager<User>> CreateSimpleUserManagerMock(AppDbContext context)
        {
            var storeMock = new Mock<IUserStore<User>>();
            var userManagerMock = new Mock<UserManager<User>>(
                storeMock.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            userManagerMock.Setup(m => m.FindByIdAsync(It.IsAny<string>()))
                .ReturnsAsync((string id) => context.Users.FirstOrDefault(u => u.Id == id));

            userManagerMock.Setup(m => m.UpdateAsync(It.IsAny<User>()))
                .ReturnsAsync(IdentityResult.Success);

            // Directly return context.Users to bypass internal Moq expression tree limitations
            userManagerMock.Setup(m => m.Users).Returns(context.Users);

            return userManagerMock;
        }

        [Fact]
        public async Task GetUsers_AdminRole_ReturnsAllUsersAcrossCompanies()
        {
            // Arrange
            using var context = CreateContext();
            context.Users.AddRange(
                new User { Id = "admin-id", FullName = "Global Admin", RoleID = 1, CompanyId = 10, Email = "admin@test.com", UserName = "admin@test.com" },
                new User { Id = "user-b", FullName = "Company B Employee", RoleID = 2, CompanyId = 20, Email = "b@test.com", UserName = "b@test.com" }
            );
            await context.SaveChangesAsync();

            var userManagerMock = CreateSimpleUserManagerMock(context);
            var controller = new UsersController(userManagerMock.Object, context)
            {
                ControllerContext = CreateControllerContext("admin-id", "1")
            };

            // Act
            var result = await controller.GetUsers(search: null);

            // Assert
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var items = Assert.IsAssignableFrom<IEnumerable<UserDisplayDto>>(ok.Value).ToList();
            
            Assert.Equal(2, items.Count);
        }

        [Fact]
        public async Task GetUsers_ForemanRole_ReturnsOnlySameCompanyUsers()
        {
            // Arrange
            using var context = CreateContext();
            context.Users.AddRange(
                new User { Id = "foreman-id", FullName = "Foreman Jack", RoleID = 2, CompanyId = 10, Email = "jack@test.com", UserName = "jack@test.com" },
                new User { Id = "peer-id", FullName = "Same Company Peer", RoleID = 3, CompanyId = 10, Email = "peer@test.com", UserName = "peer@test.com" },
                new User { Id = "stranger-id", FullName = "Other Company User", RoleID = 3, CompanyId = 99, Email = "stranger@test.com", UserName = "stranger@test.com" }
            );
            await context.SaveChangesAsync();

            var userManagerMock = CreateSimpleUserManagerMock(context);
            var controller = new UsersController(userManagerMock.Object, context)
            {
                ControllerContext = CreateControllerContext("foreman-id", "2")
            };

            // Act
            var result = await controller.GetUsers(search: null);

            // Assert
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var items = Assert.IsAssignableFrom<IEnumerable<UserDisplayDto>>(ok.Value).ToList();

            Assert.Equal(2, items.Count);
            Assert.DoesNotContain(items, u => u.Id == "stranger-id");
        }

        [Fact]
        public async Task GetUsers_RegularUser_ReturnsForbid()
        {
            // Arrange
            using var context = CreateContext();
            context.Users.Add(new User { Id = "regular-id", RoleID = 3, Email = "reg@test.com", UserName = "reg@test.com" });
            await context.SaveChangesAsync();

            var userManagerMock = CreateSimpleUserManagerMock(context);
            var controller = new UsersController(userManagerMock.Object, context)
            {
                ControllerContext = CreateControllerContext("regular-id", "3")
            };

            // Act
            var result = await controller.GetUsers(search: null);

            // Assert
            Assert.IsType<ForbidResult>(result.Result);
        }

        [Fact]
        public async Task UpdateUserRole_SelfDemotion_ReturnsBadRequest()
        {
            // Arrange
            using var context = CreateContext();
            context.Users.Add(new User { Id = "admin-id", RoleID = 1, Email = "admin@test.com", UserName = "admin@test.com" });
            await context.SaveChangesAsync();

            var userManagerMock = CreateSimpleUserManagerMock(context);
            var controller = new UsersController(userManagerMock.Object, context)
            {
                ControllerContext = CreateControllerContext("admin-id", "1")
            };

            var payload = new UserRoleUpdateDto { RoleID = 2 };

            // Act
            var result = await controller.UpdateUserRole("admin-id", payload);

            // Assert
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("You cannot demote yourself from Admin.", badRequest.Value);
        }

        [Fact]
        public async Task GetUsers_WithSearchQuery_ExecutesSearchBranch()
        {
            // Arrange
            using var context = CreateContext();
            context.Users.AddRange(
                new User { Id = "admin-id", FullName = "Global Admin", RoleID = 1, CompanyId = 10, Email = "admin@test.com", UserName = "admin@test.com" },
                new User { Id = "user-match", FullName = "Alex Smith", RoleID = 2, CompanyId = 10, Email = "alex@test.com", UserName = "alex@test.com" },
                new User { Id = "user-nomatch", FullName = "John Doe", RoleID = 2, CompanyId = 10, Email = "john@test.com", UserName = "john@test.com" }
            );
            await context.SaveChangesAsync();

            var userManagerMock = CreateSimpleUserManagerMock(context);
            var controller = new UsersController(userManagerMock.Object, context)
            {
                ControllerContext = CreateControllerContext("admin-id", "1")
            };

            // Act - Passing a search string forces the code to evaluate the search condition branch
            var result = await controller.GetUsers(search: "Alex");

            // Assert
            var ok = Assert.IsType<OkObjectResult>(result.Result);
            var items = Assert.IsAssignableFrom<IEnumerable<UserDisplayDto>>(ok.Value).ToList();
            Assert.Single(items);
            Assert.Contains(items, u => u.FullName.Contains("Alex"));
        }

        [Fact]
        public async Task UpdateUserRole_UserNotFound_ReturnsNotFound()
        {
            // Arrange
            using var context = CreateContext();
            context.Users.Add(new User { Id = "admin-id", RoleID = 1, Email = "admin@test.com", UserName = "admin@test.com" });
            await context.SaveChangesAsync();

            var userManagerMock = CreateSimpleUserManagerMock(context);
            var controller = new UsersController(userManagerMock.Object, context)
            {
                ControllerContext = CreateControllerContext("admin-id", "1")
            };

            var payload = new UserRoleUpdateDto { RoleID = 2 };

            // Act - Try updating a user that doesn't exist to trigger 'if (user == null)'
            var result = await controller.UpdateUserRole("invalid-user-id", payload);

            // Assert
            Assert.True(result is NotFoundResult || result is NotFoundObjectResult);
        }

        [Fact]
        public async Task UpdateUserRole_ValidUser_ReturnsSuccessAndChangesRole()
        {
            // Arrange
            using var context = CreateContext();
            var targetUser = new User { Id = "target-worker-id", RoleID = 3, Email = "worker@test.com", UserName = "worker@test.com" };
            context.Users.AddRange(
                new User { Id = "admin-id", RoleID = 1, Email = "admin@test.com", UserName = "admin@test.com" },
                targetUser
            );
            await context.SaveChangesAsync();

            var userManagerMock = CreateSimpleUserManagerMock(context);
            var controller = new UsersController(userManagerMock.Object, context)
            {
                ControllerContext = CreateControllerContext("admin-id", "1")
            };

            var payload = new UserRoleUpdateDto { RoleID = 2 };

            // Act - Testing the full happy path branch execution
            var result = await controller.UpdateUserRole("target-worker-id", payload);

            // Assert
            Assert.True(result is OkResult || result is NoContentResult || result is OkObjectResult);
            Assert.Equal(2, targetUser.RoleID); // Verify database/model branch updated successfully
        }
    }
}