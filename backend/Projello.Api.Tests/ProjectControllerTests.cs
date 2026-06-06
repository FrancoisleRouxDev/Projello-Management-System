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
            // 1. Setup In-Memory Database
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AppDbContext(options);

            // 2. Setup UserManager Mock
            var store = new Mock<IUserStore<User>>();
            _userManagerMock = new Mock<UserManager<User>>(store.Object, null, null, null, null, null, null, null, null);

            // 3. Setup SignalR Hub Mock
            _hubContextMock = new Mock<IHubContext<TeamNotificationHub>>();
            _hubClientsMock = new Mock<IHubClients>();
            _clientProxyMock = new Mock<IClientProxy>();

            _hubContextMock.Setup(h => h.Clients).Returns(_hubClientsMock.Object);
            _hubClientsMock.Setup(c => c.User(It.IsAny<string>())).Returns(_clientProxyMock.Object);

            // 4. Instantiate Controller
            _controller = new ProjectsController(_context, _userManagerMock.Object, _hubContextMock.Object);
        }

        // Helper to simulate a logged-in user
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

        [Fact]
        public async Task GetProjects_AsGlobalAdmin_ReturnsAllProjects()
        {
            // Arrange
            SetCurrentUser("admin-1", "1"); // Role 1 = Admin

            _context.Projects.Add(new Project { ProjectID = 1, Name = "Project A", CreatedByUserID = "admin-1" });
            _context.Projects.Add(new Project { ProjectID = 2, Name = "Project B", CreatedByUserID = "admin-1" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetProjects();

            // Assert
            var actionResult = Assert.IsType<OkObjectResult>(result.Result);
            var projects = Assert.IsAssignableFrom<IEnumerable<ProjectReadDto>>(actionResult.Value);
            Assert.Equal(2, projects.Count());
        }

        [Fact]
        public async Task CreateProject_AsAdmin_CreatesAndReturnsProject()
        {
            // Arrange
            SetCurrentUser("admin-1", "1");

            var dto = new ProjectCreateDto
            {
                Name = "New Build",
                ClientID = 10,
                Description = "Building test",
                StartDate = DateOnly.FromDateTime(DateTime.UtcNow),
                DueDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10))
            };

            // Act
            var result = await _controller.CreateProject(dto);

            // Assert
            var actionResult = Assert.IsType<CreatedAtActionResult>(result.Result);
            var createdProject = Assert.IsType<ProjectReadDto>(actionResult.Value);
            
            Assert.Equal("New Build", createdProject.Name);
            Assert.Equal("Planning", createdProject.Status);
            Assert.Equal(1, _context.Projects.Count());
        }

        [Fact]
        public async Task CreateProject_AsStandardUser_ReturnsForbid()
        {
            // Arrange
            SetCurrentUser("user-1", "2"); // Role 2 = Standard User (Not 1 or 4)

            var dto = new ProjectCreateDto { Name = "Forbidden Project" };

            // Act
            var result = await _controller.CreateProject(dto);

            // Assert
            Assert.IsType<ForbidResult>(result.Result);
        }

        [Fact]
        public async Task AddProjectMember_Success_SendsSignalRNotifications()
        {
            // Arrange
            var currentUserId = "foreman-1";
            var targetUserId = "worker-1";
            SetCurrentUser(currentUserId, "2"); // Standard user, but we'll make them a foreman

            var client = new Client { CompanyID = 99 };
            var project = new Project { ProjectID = 1, Name = "Site A", Client = client, CreatedByUserID = currentUserId };
            
            _context.Projects.Add(project);
            _context.ProjectMembers.Add(new ProjectMember 
            { 
                ProjectID = 1, UserID = currentUserId, AssignedAs = "Foreman" 
            });
            await _context.SaveChangesAsync();

            // Setup current user
            _userManagerMock.Setup(u => u.FindByIdAsync(currentUserId))
                .ReturnsAsync(new User { Id = currentUserId, CompanyId = 99, FullName = "Foreman Bob" });

            // Setup target user
            _userManagerMock.Setup(u => u.FindByIdAsync(targetUserId))
                .ReturnsAsync(new User { Id = targetUserId, CompanyId = 99, FullName = "Worker Joe" });

            var dto = new AddProjectMemberDto
            {
                UserID = targetUserId,
                AssignedAs = "Worker"
            };

            // Act
            var result = await _controller.AddProjectMember(1, dto);

            // Assert
            Assert.IsType<OkObjectResult>(result);

            // Verify Database
            var newMember = await _context.ProjectMembers.FirstOrDefaultAsync(m => m.UserID == targetUserId);
            Assert.NotNull(newMember);
            Assert.Equal("Worker", newMember.AssignedAs);

            // Verify SignalR notifications were sent to BOTH the adder and the addee
            _hubClientsMock.Verify(c => c.User(currentUserId), Times.Once);
            _hubClientsMock.Verify(c => c.User(targetUserId), Times.Once);
            _clientProxyMock.Verify(
                p => p.SendCoreAsync("WorkerJoinedProject", It.IsAny<object[]>(), default), 
                Times.Exactly(2)
            );
        }

        public void Dispose()
        {
            // Clean up the in-memory database after each test
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}