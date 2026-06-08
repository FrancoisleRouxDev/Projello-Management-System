using Microsoft.AspNetCore.SignalR;
using Moq;
using System.Security.Claims;
using Xunit;
using Projello.Api.Hubs;

namespace Projello.Api.Tests.Hubs
{
    public class TeamNotificationHubTests : IDisposable
    {
        private readonly TeamNotificationHub _hub;
        private readonly Mock<HubCallerContext> _mockContext;
        private readonly StringWriter _consoleOutput;
        private readonly TextWriter _originalOutput;

        public TeamNotificationHubTests()
        {
            // 1. Instantiate the Hub
            _hub = new TeamNotificationHub();

            // 2. Mock the HubCallerContext
            _mockContext = new Mock<HubCallerContext>();
            _hub.Context = _mockContext.Object;

            // 3. Intercept Console Output
            _originalOutput = Console.Out;
            _consoleOutput = new StringWriter();
            Console.SetOut(_consoleOutput);
        }

        [Fact]
        public async Task OnConnectedAsync_WithValidUser_LogsConnectionAndClaims()
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
            await _hub.OnConnectedAsync();

            // Assert
            var output = _consoleOutput.ToString();
            
            Assert.Contains($"[TeamHub] Connected: ConnectionId={connectionId} UserIdentifier={userId}", output);
            Assert.Contains($"[TeamHub] Claim: {ClaimTypes.NameIdentifier} = {userId}", output);
            Assert.Contains("[TeamHub] Claim: RoleID = 1", output);
        }

        [Fact]
        public async Task OnConnectedAsync_WithNoUser_LogsNullIdentifierAndNoClaims()
        {
            // Arrange
            _mockContext.Setup(c => c.ConnectionId).Returns("conn-999");
            _mockContext.Setup(c => c.UserIdentifier).Returns((string)null!);
            _mockContext.Setup(c => c.User).Returns((ClaimsPrincipal)null!);

            // Act
            await _hub.OnConnectedAsync();

            // Assert
            var output = _consoleOutput.ToString();
            
            Assert.Contains("[TeamHub] Connected: ConnectionId=conn-999 UserIdentifier=null", output);
            Assert.DoesNotContain("[TeamHub] Claim:", output);
        }

        [Fact]
        public async Task OnDisconnectedAsync_WithException_LogsDisconnectionAndExceptionMessage()
        {
            // Arrange
            var connectionId = "conn-123";
            var userId = "user-abc";
            var testException = new HubException("Connection forcibly closed");

            _mockContext.Setup(c => c.ConnectionId).Returns(connectionId);
            _mockContext.Setup(c => c.UserIdentifier).Returns(userId);

            // Act
            await _hub.OnDisconnectedAsync(testException);

            // Assert
            var output = _consoleOutput.ToString();
            
            Assert.Contains($"[TeamHub] Disconnected: ConnectionId={connectionId} UserIdentifier={userId} Ex=Connection forcibly closed", output);
        }

        [Fact]
        public async Task OnDisconnectedAsync_WithoutException_LogsDisconnectionGracefully()
        {
            // Arrange
            var connectionId = "conn-123";
            var userId = "user-abc";

            _mockContext.Setup(c => c.ConnectionId).Returns(connectionId);
            _mockContext.Setup(c => c.UserIdentifier).Returns(userId);

            // Act
            await _hub.OnDisconnectedAsync(null);

            // Assert
            var output = _consoleOutput.ToString();
            
            // Should successfully log but without an exception message
            Assert.Contains($"[TeamHub] Disconnected: ConnectionId={connectionId} UserIdentifier={userId} Ex=", output);
        }

        public void Dispose()
        {
            // Restore the standard console output to prevent affecting other tests
            Console.SetOut(_originalOutput);
            _consoleOutput.Dispose();
        }
    }
}