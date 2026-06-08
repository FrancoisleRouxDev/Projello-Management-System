using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Moq;
using Projello.Api.Data;
using Projello.Api.Hubs;
using Projello.Api.Models;
using System.Security.Claims;
using Xunit;

namespace Projello.Api.Tests.Hubs
{
    public class ProjectCallHubTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly ProjectCallHub _hub;
        
        // SignalR Mocks
        private readonly Mock<HubCallerContext> _mockContext;
        private readonly Mock<IHubCallerClients> _mockClients;
        private readonly Mock<IGroupManager> _mockGroups;
        private readonly Mock<IClientProxy> _mockClientProxy;
        private readonly Mock<ISingleClientProxy> _mockCallerProxy;

        // Auto-incrementing project ID to avoid static dictionary collisions during parallel test runs
        private static int _projectIdCounter = 5000;

        public ProjectCallHubTests()
        {
            // 1. In-Memory Database
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AppDbContext(options);

            // 2. Setup SignalR Mocks
            _mockContext = new Mock<HubCallerContext>();
            _mockClients = new Mock<IHubCallerClients>();
            _mockGroups = new Mock<IGroupManager>();
            _mockClientProxy = new Mock<IClientProxy>();
            _mockCallerProxy = new Mock<ISingleClientProxy>();

            // 3. Configure Clients Mock Returns
            _mockClients.Setup(c => c.Users(It.IsAny<IReadOnlyList<string>>())).Returns(_mockClientProxy.Object);
            _mockClients.Setup(c => c.Group(It.IsAny<string>())).Returns(_mockClientProxy.Object);
            _mockClients.Setup(c => c.GroupExcept(It.IsAny<string>(), It.IsAny<IReadOnlyList<string>>())).Returns(_mockClientProxy.Object);
            _mockClients.Setup(c => c.Caller).Returns(_mockCallerProxy.Object);

            // 4. Instantiate Hub & Inject Contexts
            _hub = new ProjectCallHub(_context)
            {
                Context = _mockContext.Object,
                Clients = _mockClients.Object,
                Groups = _mockGroups.Object
            };
        }

        private void SetupHubContext(string connectionId, string userId, string fullName = "Test User")
        {
            _mockContext.Setup(c => c.ConnectionId).Returns(connectionId);
            _mockContext.Setup(c => c.UserIdentifier).Returns(userId);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("FullName", fullName)
            };
            
            var identity = new ClaimsIdentity(claims, "mock");
            var principal = new ClaimsPrincipal(identity);
            
            _mockContext.Setup(c => c.User).Returns(principal);
        }

        private int GetNextProjectId() => Interlocked.Increment(ref _projectIdCounter);

        #region RingUsers Tests

        [Fact]
        public async Task RingUsers_Unauthenticated_ThrowsHubException()
        {
            _mockContext.Setup(c => c.UserIdentifier).Returns((string)null!);

            var ex = await Assert.ThrowsAsync<HubException>(() => 
                _hub.RingUsers("1", new[] { "target-1" }));
            
            Assert.Equal("User not authenticated.", ex.Message);
        }

        [Fact]
        public async Task RingUsers_NotAMember_ThrowsHubException()
        {
            var projectId = GetNextProjectId();
            SetupHubContext("conn-1", "rogue-user");

            // We do NOT add the user to _context.ProjectMembers

            var ex = await Assert.ThrowsAsync<HubException>(() => 
                _hub.RingUsers(projectId.ToString(), new[] { "target-1" }));
            
            Assert.Equal("You are not a member of this project.", ex.Message);
        }

        [Fact]
        public async Task RingUsers_AsValidMember_SendsIncomingCallNotification()
        {
            var projectId = GetNextProjectId();
            var userId = "caller-1";
            SetupHubContext("conn-1", userId, "John Doe");

            // Satisfy EF Core constraints
            _context.Projects.Add(new Project { ProjectID = projectId, Name = "Hub Project", CreatedByUserID = "admin" });
            _context.ProjectMembers.Add(new ProjectMember { ProjectID = projectId, UserID = userId, AssignedAs = "Worker" });
            await _context.SaveChangesAsync();

            var targets = new[] { "target-1", "target-2" };

            await _hub.RingUsers(projectId.ToString(), targets);

            // Verify the clients were targeted and SendCoreAsync was invoked
            _mockClients.Verify(c => c.Users(targets), Times.Once);
            _mockClientProxy.Verify(
                p => p.SendCoreAsync("IncomingProjectCall", 
                    It.Is<object[]>(args => (string)args[0] == projectId.ToString()), 
                    default), 
                Times.Once);
        }

        #endregion

        #region Join/Leave Call Tests

        [Fact]
        public async Task JoinProjectCall_AsValidMember_AddsToGroupAndNotifies()
        {
            var projectId = GetNextProjectId();
            var userId = "user-1";
            var connectionId = "conn-1";
            SetupHubContext(connectionId, userId);

            _context.Projects.Add(new Project { ProjectID = projectId, Name = "Hub Project", CreatedByUserID = "admin" });
            _context.ProjectMembers.Add(new ProjectMember { ProjectID = projectId, UserID = userId, AssignedAs = "Worker" });
            await _context.SaveChangesAsync();

            await _hub.JoinProjectCall(projectId.ToString());

            var expectedGroup = $"project-call:{projectId}";

            _mockGroups.Verify(g => g.AddToGroupAsync(connectionId, expectedGroup, default), Times.Once);
            _mockClients.Verify(c => c.GroupExcept(expectedGroup, It.Is<IReadOnlyList<string>>(l => l.Contains(connectionId))), Times.Once);
            _mockCallerProxy.Verify(p => p.SendCoreAsync("JoinedProjectCall", It.IsAny<object[]>(), default), Times.Once);
        }

        [Fact]
        public async Task LeaveProjectCall_RemovesFromGroupAndNotifies()
        {
            var projectId = GetNextProjectId();
            var userId = "user-1";
            var connectionId = "conn-1";
            SetupHubContext(connectionId, userId);

            await _hub.LeaveProjectCall(projectId.ToString());

            var expectedGroup = $"project-call:{projectId}";
            
            _mockGroups.Verify(g => g.RemoveFromGroupAsync(connectionId, expectedGroup, default), Times.Once);
            _mockClients.Verify(c => c.Group(expectedGroup), Times.Once);
        }

        #endregion

        #region WebRTC Signaling Tests

        [Fact]
        public async Task SendOffer_BroadcastsToGroup()
        {
            var projectId = GetNextProjectId().ToString();
            SetupHubContext("conn-1", "user-1");

            await _hub.SendOffer(projectId, "target-1", "sdp-offer-data");

            _mockClients.Verify(c => c.Group($"project-call:{projectId}"), Times.Once);
            _mockClientProxy.Verify(p => p.SendCoreAsync("ReceiveOffer", It.IsAny<object[]>(), default), Times.Once);
        }

        [Fact]
        public async Task SendAnswer_BroadcastsToGroup()
        {
            var projectId = GetNextProjectId().ToString();
            SetupHubContext("conn-1", "user-1");

            await _hub.SendAnswer(projectId, "target-1", "sdp-answer-data");

            _mockClients.Verify(c => c.Group($"project-call:{projectId}"), Times.Once);
            _mockClientProxy.Verify(p => p.SendCoreAsync("ReceiveAnswer", It.IsAny<object[]>(), default), Times.Once);
        }

        #endregion

        #region Disconnect & Dictionary Cleanup Tests

        [Fact]
        public async Task OnDisconnectedAsync_CleansUpStaticDictionary()
        {
            var projectId = GetNextProjectId();
            var userId = "user-to-disconnect";
            SetupHubContext("conn-1", userId);

            _context.Projects.Add(new Project { ProjectID = projectId, Name = "Hub Project", CreatedByUserID = "admin" });
            _context.ProjectMembers.Add(new ProjectMember { ProjectID = projectId, UserID = userId, AssignedAs = "Worker" });
            await _context.SaveChangesAsync();

            // First, join to populate the static dictionary
            await _hub.JoinProjectCall(projectId.ToString());
            
            var beforeDisconnect = await _hub.GetActiveParticipants(projectId.ToString());
            Assert.Contains(userId, beforeDisconnect);

            // Act: Fire the disconnect event
            await _hub.OnDisconnectedAsync(null);

            // Assert: The user was removed from the static dictionary
            var afterDisconnect = await _hub.GetActiveParticipants(projectId.ToString());
            Assert.DoesNotContain(userId, afterDisconnect);
        }

        #endregion

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}