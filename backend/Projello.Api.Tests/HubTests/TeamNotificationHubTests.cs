using Microsoft.AspNetCore.SignalR;
using Moq;
using System.Security.Claims;
using Xunit;
using Projello.Api.Hubs;

namespace Projello.Api.Tests.Hubs
{
    public class TeamNotificationHubTests
    {
        private readonly TeamNotificationHub _hub;
        private readonly Mock<HubCallerContext> _mockContext;

        public TeamNotificationHubTests()
        {
            // 1. Instantiate the Hub
            _hub = new TeamNotificationHub();

            // 2. Mock the HubCallerContext
            _mockContext = new Mock<HubCallerContext>();
            _hub.Context = _mockContext.Object;
        }

        [Fact]
        public async Task OnConnectedAsync_WithValidUser_ExecutesSuccessfully()
        {
            // Arrange
            var connectionId = "conn-123";
            var userId = "user-abc";

            _mockContext.Setup(c => c.ConnectionId).Returns(connectionId);
            _mockContext.Setup(c => c.UserIdentifier).Returns(userId);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("RoleID", "1")
            };
            
            var identity = new ClaimsIdentity(claims, "mock_auth");
            var principal = new ClaimsPrincipal(identity);

            _mockContext.Setup(c => c.User).Returns(principal);

            // Act
            var exception = await Record.ExceptionAsync(() => _hub.OnConnectedAsync());

            // Assert
            Assert.Null(exception); // Verifies the method completed without crashing
        }

        [Fact]
        public async Task OnConnectedAsync_WithNoUser_ExecutesSuccessfully()
        {
            // Arrange
            _mockContext.Setup(c => c.ConnectionId).Returns("conn-999");
            _mockContext.Setup(c => c.UserIdentifier).Returns((string)null!);
            _mockContext.Setup(c => c.User).Returns((ClaimsPrincipal)null!);

            // Act
            var exception = await Record.ExceptionAsync(() => _hub.OnConnectedAsync());

            // Assert
            Assert.Null(exception);
        }

        [Fact]
        public async Task OnDisconnectedAsync_WithException_ExecutesSuccessfully()
        {
            // Arrange
            var connectionId = "conn-123";
            var testException = new HubException("Connection forcibly closed");

            _mockContext.Setup(c => c.ConnectionId).Returns(connectionId);

            // Act
            var exception = await Record.ExceptionAsync(() => _hub.OnDisconnectedAsync(testException));

            // Assert
            Assert.Null(exception);
        }

        [Fact]
        public async Task OnDisconnectedAsync_WithoutException_ExecutesSuccessfully()
        {
            // Arrange
            var connectionId = "conn-123";

            _mockContext.Setup(c => c.ConnectionId).Returns(connectionId);

            // Act
            var exception = await Record.ExceptionAsync(() => _hub.OnDisconnectedAsync(null));

            // Assert
            Assert.Null(exception);
        }
    }
}