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
using System.Security.Claims;
using Xunit;

namespace Projello.Api.Tests.Controllers
{
    public class ProjectsControllerTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly Mock<UserManager<User>> _userManagerMock;
        private readonly Mock<IHubContext<TeamNotificationHub>> _hubContextMock;
        private readonly Mock<IHubClients> _hubClientsMock;
        private readonly Mock<IClientProxy> _clientProxyMock;
        private readonly ProjectsController _controller;

        public ProjectsControllerTests()
        {

            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AppDbContext(options);

            var store = new Mock<IUserStore<User>>();
            _userManagerMock = new Mock<UserManager<User>>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);

            _hubContextMock = new Mock<IHubContext<TeamNotificationHub>>();
            _hubClientsMock = new Mock<IHubClients>();
            _clientProxyMock = new Mock<IClientProxy>();

            _hubContextMock.Setup(h => h.Clients).Returns(_hubClientsMock.Object);
            _hubClientsMock.Setup(c => c.User(It.IsAny<string>())).Returns(_clientProxyMock.Object);

            _controller = new ProjectsController(_context, _userManagerMock.Object, _hubContextMock.Object);
        }

        private void SetCurrentUser(string userId, string roleId)
        {
            var user = new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("RoleID", roleId)
            }, "mock"));

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }

        #region GetProjects Tests (Coverage for Company Filtering)

        [Fact]
        public async Task GetProjects_AsGlobalAdmin_ReturnsAllProjects()
        {
            var userId = "admin-1";
            SetCurrentUser(userId, "1"); // Role 1 = Admin

            _userManagerMock.Setup(u => u.FindByIdAsync(userId))
                .ReturnsAsync(new User { Id = userId, CompanyId = 10 }); 

            _context.Projects.Add(new Project { ProjectID = 1, Name = "Project A", CreatedByUserID = userId, Client = new Client { CompanyID = 10, Name = "Test Client" } });
            _context.Projects.Add(new Project { ProjectID = 2, Name = "Project B", CreatedByUserID = userId, Client = new Client { CompanyID = 10, Name = "Test Client" } });
            await _context.SaveChangesAsync();

            var result = await _controller.GetProjects();

            var actionResult = Assert.IsType<OkObjectResult>(result.Result);
            var projects = Assert.IsAssignableFrom<IEnumerable<ProjectReadDto>>(actionResult.Value);
            Assert.Equal(2, projects.Count());
        }

        [Fact]
        public async Task GetProjects_AsStandardUser_ReturnsOnlyJoinedProjects()
        {
            var userId = "user-1";
            SetCurrentUser(userId, "2"); 

            _userManagerMock.Setup(u => u.FindByIdAsync(userId))
                .ReturnsAsync(new User { Id = userId, CompanyId = 10 });

            _context.Projects.Add(new Project 
            { 
                ProjectID = 1, 
                Name = "Project A", 
                CreatedByUserID = userId, 
                Client = new Client { CompanyID = 10, Name = "Test Client" } 
            });
            _context.ProjectMembers.Add(new ProjectMember { ProjectID = 1, UserID = userId, AssignedAs = "Worker" });
            
            _context.Projects.Add(new Project 
            { 
                ProjectID = 2, 
                Name = "Project B", 
                CreatedByUserID = userId, 
                Client = new Client { CompanyID = 10, Name = "Test Client" } 
            });

            await _context.SaveChangesAsync();

            var result = await _controller.GetProjects();

            var actionResult = Assert.IsType<OkObjectResult>(result.Result);
            var projects = Assert.IsAssignableFrom<IEnumerable<ProjectReadDto>>(actionResult.Value);
            
            Assert.Single(projects); 
            Assert.Equal(1, projects.First().ProjectID);
        }

        [Fact]
        public async Task GetProjects_AsCompanyOwner_ReturnsAllCompanyProjects()
        {
            var userId = "owner-1";
            SetCurrentUser(userId, "4"); // Role 4 = Company Owner

            _userManagerMock.Setup(u => u.FindByIdAsync(userId))
                .ReturnsAsync(new User { Id = userId, CompanyId = 10 });

            _context.Projects.Add(new Project { ProjectID = 1, Name = "Project A", CreatedByUserID = userId, Client = new Client { CompanyID = 10, Name = "Client A" } });
            _context.Projects.Add(new Project { ProjectID = 2, Name = "Project B", CreatedByUserID = userId, Client = new Client { CompanyID = 99, Name = "Client B" } });
            await _context.SaveChangesAsync();

            var result = await _controller.GetProjects();

            var actionResult = Assert.IsType<OkObjectResult>(result.Result);
            var projects = Assert.IsAssignableFrom<IEnumerable<ProjectReadDto>>(actionResult.Value);
            
            Assert.Single(projects); 
            Assert.Equal(1, projects.First().ProjectID);
        }

        #endregion

        #region GetProject(id) Tests (Coverage for Security Checks & 404s)

        [Fact]
        public async Task GetProject_InvalidId_ReturnsNotFound()
        {
            SetCurrentUser("admin-1", "1");
            var result = await _controller.GetProject(999);
            Assert.IsType<NotFoundResult>(result.Result);
        }

        [Fact]
        public async Task GetProject_CompanyMismatch_ReturnsForbid()
        {
            var userId = "owner-1";
            SetCurrentUser(userId, "4"); 

            _userManagerMock.Setup(u => u.FindByIdAsync(userId))
                .ReturnsAsync(new User { Id = userId, CompanyId = 10 });

            _context.Projects.Add(new Project 
            { 
                ProjectID = 1, 
                Name = "Project Foreign", 
                CreatedByUserID = userId, 
                Client = new Client { CompanyID = 99, Name = "Test Client" } 
            });
            await _context.SaveChangesAsync();

            var result = await _controller.GetProject(1);
            Assert.IsType<ForbidResult>(result.Result);
        }

        [Fact]
        public async Task GetProject_AsStandardNonMember_ReturnsForbid()
        {
            var userId = "user-1";
            SetCurrentUser(userId, "2"); 

            _userManagerMock.Setup(u => u.FindByIdAsync(userId))
                .ReturnsAsync(new User { Id = userId, CompanyId = 10 });

            _context.Projects.Add(new Project 
            { 
                ProjectID = 1, 
                Name = "Project Internal", 
                CreatedByUserID = userId, 
                Client = new Client { CompanyID = 10, Name = "Test Client" } 
            });
            await _context.SaveChangesAsync();

            var result = await _controller.GetProject(1);
            Assert.IsType<ForbidResult>(result.Result);
        }

        [Fact]
        public async Task GetProject_AuthorizedUser_ReturnsProject()
        {
            var userId = "user-1";
            SetCurrentUser(userId, "2"); 

            var userEntity = new User { Id = userId, CompanyId = 10, FullName = "Test User", Email = "test@test.com" };
            _context.Users.Add(userEntity);

            _userManagerMock.Setup(u => u.FindByIdAsync(userId))
                .ReturnsAsync(userEntity);

            var client = new Client { CompanyID = 10, Name = "Test Client" };
            var project = new Project 
            { 
                ProjectID = 1, 
                Name = "Project Internal", 
                CreatedByUserID = userId, 
                Client = client 
            };
            _context.Projects.Add(project);
            
            _context.ProjectMembers.Add(new ProjectMember { ProjectID = 1, UserID = userId, User = userEntity, AssignedAs = "Worker" });
            await _context.SaveChangesAsync();

            var result = await _controller.GetProject(1);

            var actionResult = Assert.IsType<OkObjectResult>(result.Result);
            var projectDto = Assert.IsType<ProjectReadDto>(actionResult.Value);
            Assert.Equal(1, projectDto.ProjectID);
        }

        #endregion

        #region CreateProject Tests

        [Fact]
        public async Task CreateProject_AsAdmin_CreatesAndReturnsProject()
        {
            SetCurrentUser("admin-1", "1");

            var dto = new ProjectCreateDto
            {
                Name = "New Build",
                ClientID = 10,
                Description = "Building test",
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10))
            };

            var result = await _controller.CreateProject(dto);

            var actionResult = Assert.IsType<CreatedAtActionResult>(result.Result);
            var createdProject = Assert.IsType<ProjectReadDto>(actionResult.Value);
            
            Assert.Equal("New Build", createdProject.Name);
            Assert.Equal("Not Started", createdProject.Status);
        }

        [Fact]
        public async Task CreateProject_AsStandardUser_ReturnsForbid()
        {
            SetCurrentUser("user-1", "2"); 
            var dto = new ProjectCreateDto { Name = "Forbidden Project" };
            var result = await _controller.CreateProject(dto);
            Assert.IsType<ForbidResult>(result.Result);
        }

        [Fact]
        public async Task CreateProject_WithWrongCompanyClient_ReturnsForbid()
        {
            var userId = "owner-1";
            SetCurrentUser(userId, "4"); 

            _userManagerMock.Setup(u => u.FindByIdAsync(userId))
                .ReturnsAsync(new User { Id = userId, CompanyId = 10 }); 

            _context.Clients.Add(new Client { ClientID = 5, CompanyID = 99, Name = "Test Client" });
            await _context.SaveChangesAsync();

            var dto = new ProjectCreateDto { ClientID = 5, Name = "Test" };
            var result = await _controller.CreateProject(dto);

            Assert.IsType<ForbidResult>(result.Result);
        }

        #endregion

        #region AddProjectMember Tests (Coverage for Validations)

        [Fact]
        public async Task AddProjectMember_DifferentCompanyTarget_ReturnsBadRequest()
        {
            var currentUserId = "foreman-1";
            var targetUserId = "worker-1";
            SetCurrentUser(currentUserId, "2"); 

            _userManagerMock.Setup(u => u.FindByIdAsync(currentUserId))
                .ReturnsAsync(new User { Id = currentUserId, CompanyId = 99 });
            _userManagerMock.Setup(u => u.FindByIdAsync(targetUserId))
                .ReturnsAsync(new User { Id = targetUserId, CompanyId = 50 });

            _context.Projects.Add(new Project 
            { 
                ProjectID = 1, 
                Name = "Project Alpha", 
                CreatedByUserID = currentUserId, 
                Client = new Client { CompanyID = 99, Name = "Test Client" } 
            });
            _context.ProjectMembers.Add(new ProjectMember { ProjectID = 1, UserID = currentUserId, AssignedAs = "Foreman" });
            await _context.SaveChangesAsync();

            var dto = new AddProjectMemberDto { UserID = targetUserId };
            var result = await _controller.AddProjectMember(1, dto);

            var actionResult = Assert.IsType<BadRequestObjectResult>(result);
            Assert.Equal("User must be in the same company", actionResult.Value);
        }

        [Fact]
        public async Task AddProjectMember_NotForeman_ReturnsForbid()
        {
            var currentUserId = "standard-1";
            SetCurrentUser(currentUserId, "2"); 

            _context.Projects.Add(new Project { ProjectID = 1, Name = "Project Alpha", CreatedByUserID = currentUserId });
            _context.ProjectMembers.Add(new ProjectMember { ProjectID = 1, UserID = currentUserId, AssignedAs = "Worker" });
            await _context.SaveChangesAsync();

            var dto = new AddProjectMemberDto { UserID = "some-user" };
            var result = await _controller.AddProjectMember(1, dto);

            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task AddProjectMember_Success_SendsSignalRNotifications()
        {
            var currentUserId = "foreman-1";
            var targetUserId = "worker-1";
            SetCurrentUser(currentUserId, "2"); 

            var client = new Client { CompanyID = 99, Name = "Test Client" };
            var project = new Project { ProjectID = 1, Name = "Site A", CreatedByUserID = currentUserId, Client = client };
            
            _context.Projects.Add(project);
            _context.ProjectMembers.Add(new ProjectMember { ProjectID = 1, UserID = currentUserId, AssignedAs = "Foreman" });
            await _context.SaveChangesAsync();

            _userManagerMock.Setup(u => u.FindByIdAsync(currentUserId))
                .ReturnsAsync(new User { Id = currentUserId, CompanyId = 99, FullName = "Foreman Bob" });
            _userManagerMock.Setup(u => u.FindByIdAsync(targetUserId))
                .ReturnsAsync(new User { Id = targetUserId, CompanyId = 99, FullName = "Worker Joe" });

            var dto = new AddProjectMemberDto { UserID = targetUserId, AssignedAs = "Worker" };
            var result = await _controller.AddProjectMember(1, dto);

            Assert.IsType<OkObjectResult>(result);

            _hubClientsMock.Verify(c => c.User(currentUserId), Times.Once);
            _hubClientsMock.Verify(c => c.User(targetUserId), Times.Once);
            _clientProxyMock.Verify(p => p.SendCoreAsync("WorkerJoinedProject", It.IsAny<object[]>(), default), Times.Exactly(2));
        }

        #endregion

        #region UpdateProject Tests

        [Fact]
        public async Task UpdateProject_InvalidId_ReturnsNotFound()
        {
            SetCurrentUser("admin-1", "1");
            var dto = new ProjectUpdateDto { Name = "Updated Name" }; 

            var result = await _controller.UpdateProject(999, dto);
            Assert.True(result is NotFoundResult || result is NotFoundObjectResult);
        }

        [Fact]
        public async Task UpdateProject_CompanyMismatch_ReturnsForbid()
        {
            var userId = "owner-1";
            SetCurrentUser(userId, "4");

            _userManagerMock.Setup(u => u.FindByIdAsync(userId))
                .ReturnsAsync(new User { Id = userId, CompanyId = 10 });

            _context.Projects.Add(new Project 
            { 
                ProjectID = 1, 
                Name = "Old Name", 
                CreatedByUserID = userId,
                Client = new Client { CompanyID = 99, Name = "Test Client" } 
            });
            await _context.SaveChangesAsync();

            var dto = new ProjectUpdateDto { Name = "Updated Name" };
            var result = await _controller.UpdateProject(1, dto);

            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task UpdateProject_Success_UpdatesAndReturnsOk()
        {
            var userId = "admin-1";
            SetCurrentUser(userId, "1"); 

            var project = new Project 
            { 
                ProjectID = 1, 
                Name = "Old Name", 
                CreatedByUserID = userId,
                Client = new Client { CompanyID = 10, Name = "Test Client" } 
            };
            _context.Projects.Add(project);
            await _context.SaveChangesAsync();

            var dto = new ProjectUpdateDto { Name = "Brand New Name" };
            var result = await _controller.UpdateProject(1, dto);

            Assert.True(result is OkResult || result is OkObjectResult || result is NoContentResult);
            Assert.Equal("Brand New Name", project.Name);
        }

        #endregion
        
        #region DeleteProject Tests

        [Fact]
        public async Task DeleteProject_AsAdmin_RemovesProject()
        {
            SetCurrentUser("admin-1", "1");

            _context.Projects.Add(new Project { ProjectID = 1, Name = "Project Alpha", CreatedByUserID = "admin-1" });
            await _context.SaveChangesAsync();

            var result = await _controller.DeleteProject(1);

            Assert.IsType<NoContentResult>(result);
            Assert.Empty(_context.Projects);
        }

        [Fact]
        public async Task DeleteProject_AsStandardUser_ReturnsForbid()
        {
            SetCurrentUser("user-1", "2");

            _context.Projects.Add(new Project { ProjectID = 1, Name = "Project Alpha", CreatedByUserID = "user-1" });
            await _context.SaveChangesAsync();

            var result = await _controller.DeleteProject(1);

            Assert.IsType<ForbidResult>(result);
            Assert.Single(_context.Projects); 
        }

        #endregion

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}