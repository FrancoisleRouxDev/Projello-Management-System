using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;
using Projello.Api.Controllers;
using Projello.Api.Data;
using Projello.Api.DTOs;
using Projello.Api.Hubs;
using Projello.Api.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace Projello.Api.Tests.ControllerTests
{
    public class ProjectsControllerUnhappyPathTests
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
            var mockUserManager = new Mock<UserManager<User>>(
                store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            mockUserManager.Setup(m => m.FindByIdAsync(It.IsAny<string>()))
                .ReturnsAsync((string id) => context.Users.FirstOrDefault(u => u.Id == id));
                
            return mockUserManager.Object;
        }

        private Mock<IHubContext<TeamNotificationHub>> GetMockHub()
        {
            var mockHubContext = new Mock<IHubContext<TeamNotificationHub>>();
            var mockClients = new Mock<IHubClients>();
            var mockClientProxy = new Mock<IClientProxy>();
            mockClients.Setup(clients => clients.Group(It.IsAny<string>())).Returns(mockClientProxy.Object);
            mockClients.Setup(clients => clients.User(It.IsAny<string>())).Returns(mockClientProxy.Object); 
            mockHubContext.Setup(x => x.Clients).Returns(mockClients.Object);
            return mockHubContext;
        }

        private ProjectsController CreateController(AppDbContext context, string userId, string roleId)
        {
            var controller = new ProjectsController(context, GetMockUserManager(context), GetMockHub().Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUser(userId, roleId) }
            };
            return controller;
        }

        // --- GET PROJECT FAILURES ---
        [Fact]
        public async Task GetProject_DoesNotExist_ReturnsNotFound()
        {
            var context = GetInMemoryDbContext();
            var controller = CreateController(context, "admin", "1");
            var result = await controller.GetProject(999);
            
            Assert.IsType<NotFoundResult>(result.Result);
        }

        [Fact]
        public async Task GetProject_NotAdminAndNotAssigned_ReturnsNotFound()
        {
            var context = GetInMemoryDbContext();
            context.Projects.Add(new Project { ProjectID = 1, Name = "Secret Project", CreatedByUserID = "admin-1" });
            context.SaveChanges();

            var controller = CreateController(context, "nosy-worker", "3"); 
            var result = await controller.GetProject(1);
            
            Assert.IsType<NotFoundResult>(result.Result); 
        }

        // --- CREATE PROJECT FAILURES ---
        [Fact]
        public async Task CreateProject_ClientDoesNotExist_ReturnsBadRequest()
        {
            var context = GetInMemoryDbContext();
            var controller = CreateController(context, "manager", "4"); 
            var dto = new ProjectCreateDto { ClientID = 999, Name = "New Project" };
            
            var result = await controller.CreateProject(dto);
            Assert.IsType<BadRequestObjectResult>(result.Result);
        }

        [Fact]
        public async Task CreateProject_WorkerRole_ReturnsForbid()
        {
            var context = GetInMemoryDbContext();
            var controller = CreateController(context, "worker", "3");
            var dto = new ProjectCreateDto { ClientID = 1, Name = "Attempt" };
            
            var result = await controller.CreateProject(dto);
            Assert.IsType<ForbidResult>(result.Result);
        }

        // --- UPDATE PROJECT FAILURES ---
        [Fact]
        public async Task UpdateProject_DoesNotExist_ReturnsNotFound()
        {
            var context = GetInMemoryDbContext();
            var controller = CreateController(context, "admin", "1");
            var dto = new ProjectUpdateDto { Name = "Ghost" };

            var result = await controller.UpdateProject(999, dto);
            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task UpdateProject_WorkerRole_ReturnsNotFound()
        {
            var context = GetInMemoryDbContext();
            context.Projects.Add(new Project { ProjectID = 2, Name = "Target", CreatedByUserID = "admin-1" });
            context.SaveChanges();

            var controller = CreateController(context, "worker", "3");
            var dto = new ProjectUpdateDto { Name = "Change" };

            var result = await controller.UpdateProject(2, dto);
            
            Assert.IsType<NotFoundResult>(result);
        }

        // --- UPDATE STATUS PATHS ---
        [Fact]
        public async Task UpdateProjectStatus_AsForeman_ReturnsNoContent()
        {
            var context = GetInMemoryDbContext();
            context.Projects.Add(new Project { ProjectID = 20, Name = "Status Project", CreatedByUserID = "system-admin" });
            context.ProjectMembers.Add(new ProjectMember { ProjectID = 20, UserID = "foreman-user", AssignedAs = "Foreman" });
            context.SaveChanges();

            var controller = CreateController(context, "foreman-user", "3");
            var dto = new ProjectStatusUpdateDto { Status = "In Progress" };

            var result = await controller.UpdateProjectStatus(20, dto);
            Assert.IsType<NoContentResult>(result);
        }

        [Fact]
        public async Task UpdateProjectStatus_AsUnassignedWorker_ReturnsForbid()
        {
            var context = GetInMemoryDbContext();
            context.Projects.Add(new Project { ProjectID = 21, Name = "Status Project", CreatedByUserID = "system-admin" });
            context.SaveChanges();

            var controller = CreateController(context, "regular-worker", "3");
            var dto = new ProjectStatusUpdateDto { Status = "In Progress" };

            var result = await controller.UpdateProjectStatus(21, dto);
            Assert.IsType<ForbidResult>(result);
        }

        // --- DELETE PROJECT FAILURES ---
        [Fact]
        public async Task DeleteProject_DoesNotExist_ReturnsNotFound()
        {
            var context = GetInMemoryDbContext();
            var controller = CreateController(context, "admin", "1");

            var result = await controller.DeleteProject(999);
            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task DeleteProject_WorkerRole_ReturnsForbid()
        {
            var context = GetInMemoryDbContext();
            context.Projects.Add(new Project { ProjectID = 3, Name = "To Delete", CreatedByUserID = "admin-1" });
            context.SaveChanges();

            var controller = CreateController(context, "worker", "3");
            var result = await controller.DeleteProject(3);
            Assert.IsType<ForbidResult>(result);
        }

        // --- ADD MEMBER FAILURES & BRANCHES ---
        [Fact]
        public async Task AddProjectMember_ProjectDoesNotExist_ReturnsNotFound()
        {
            var context = GetInMemoryDbContext();
            var controller = CreateController(context, "admin", "1");
            var dto = new AddProjectMemberDto { UserID = "target-user", AssignedAs = "Worker" };

            var result = await controller.AddProjectMember(999, dto);
            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task AddProjectMember_WorkerRoleNotForeman_ReturnsForbid()
        {
            var context = GetInMemoryDbContext();
            context.Projects.Add(new Project { ProjectID = 4, Name = "Build", CreatedByUserID = "admin-1" });
            context.SaveChanges();

            var controller = CreateController(context, "sneaky-worker", "3"); 
            var dto = new AddProjectMemberDto { UserID = "target", AssignedAs = "Worker" };

            var result = await controller.AddProjectMember(4, dto);
            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task AddProjectMember_TargetUserDoesNotExist_ReturnsNotFound()
        {
            var context = GetInMemoryDbContext();
            var client = new Client { CompanyID = 100, Name = "Test Client" };
            context.Clients.Add(client);
            context.Projects.Add(new Project { ProjectID = 5, Name = "Build", Client = client, CreatedByUserID = "admin-user" });
            context.Users.Add(new User { Id = "admin-user", CompanyId = 100, UserName = "admin", Email = "admin@test.com" });
            context.SaveChanges();

            var controller = CreateController(context, "admin-user", "1");
            var dto = new AddProjectMemberDto { UserID = "fake-user-id", AssignedAs = "Worker" };

            var result = await controller.AddProjectMember(5, dto);
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task AddProjectMember_UserInDifferentCompany_ReturnsBadRequestBranch()
        {
            var context = GetInMemoryDbContext();
            var client = new Client { CompanyID = 100, Name = "Company A" };
            context.Clients.Add(client);
            context.Projects.Add(new Project { ProjectID = 55, Name = "Build", Client = client, CreatedByUserID = "admin-user" });
            
            context.Users.Add(new User { Id = "admin-user", CompanyId = 100, UserName = "admin" });
            context.Users.Add(new User { Id = "outsider-user", CompanyId = 999, UserName = "outsider" });
            context.SaveChanges();

            var controller = CreateController(context, "admin-user", "1");
            var dto = new AddProjectMemberDto { UserID = "outsider-user", AssignedAs = "Worker" };

            var result = await controller.AddProjectMember(55, dto);
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("User must be in the same company", badRequestResult.Value);
        }

        [Fact]
        public async Task AddProjectMember_UserAlreadyAssigned_ReturnsBadRequest()
        {
            var context = GetInMemoryDbContext();
            var client = new Client { CompanyID = 100, Name = "Shared Company Client" };
            context.Clients.Add(client);
            var project = new Project { ProjectID = 6, Name = "Build", Client = client, CreatedByUserID = "admin-user" };
            context.Projects.Add(project);

            context.Users.Add(new User { Id = "admin-user", CompanyId = 100, UserName = "admin", Email = "admin@test.com" });
            context.Users.Add(new User { Id = "existing-user", CompanyId = 100, UserName = "existing", Email = "test@test.com" });
            context.ProjectMembers.Add(new ProjectMember { ProjectID = 6, UserID = "existing-user", AssignedAs = "Worker" });
            context.SaveChanges();

            var controller = CreateController(context, "admin-user", "1");
            var dto = new AddProjectMemberDto { UserID = "existing-user", AssignedAs = "Foreman" };

            var result = await controller.AddProjectMember(6, dto);
            Assert.IsType<BadRequestObjectResult>(result); 
        }

        // --- REMOVE MEMBER PATHS ---
        [Fact]
        public async Task RemoveProjectMember_AsForeman_ReturnsNoContent()
        {
            var context = GetInMemoryDbContext();
            context.Projects.Add(new Project { ProjectID = 70, Name = "Build", CreatedByUserID = "system-admin" });
            context.ProjectMembers.Add(new ProjectMember { ProjectID = 70, UserID = "foreman-user", AssignedAs = "Foreman" });
            context.ProjectMembers.Add(new ProjectMember { ProjectID = 70, UserID = "target-worker", AssignedAs = "Worker" });
            context.SaveChanges();

            var controller = CreateController(context, "foreman-user", "3");
            
            var result = await controller.RemoveProjectMember(70, "target-worker");
            Assert.IsType<NoContentResult>(result);
        }

        [Fact]
        public async Task RemoveProjectMember_AsWorker_ReturnsForbid()
        {
            var context = GetInMemoryDbContext();
            context.Projects.Add(new Project { ProjectID = 71, Name = "Build", CreatedByUserID = "system-admin" });
            context.ProjectMembers.Add(new ProjectMember { ProjectID = 71, UserID = "regular-worker", AssignedAs = "Worker" });
            context.SaveChanges();

            var controller = CreateController(context, "regular-worker", "3");
            
            var result = await controller.RemoveProjectMember(71, "some-other-user");
            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task RemoveProjectMember_MemberNotAssigned_ReturnsNotFound()
        {
            var context = GetInMemoryDbContext();
            context.Projects.Add(new Project { ProjectID = 7, Name = "Build", CreatedByUserID = "admin-1" });
            context.SaveChanges();

            var controller = CreateController(context, "admin", "1");
            
            var result = await controller.RemoveProjectMember(7, "unassigned-user");
            Assert.IsType<NotFoundObjectResult>(result);
        }
    }
}