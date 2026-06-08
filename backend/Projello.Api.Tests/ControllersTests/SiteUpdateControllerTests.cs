using CloudinaryDotNet;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
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

namespace Projello.Api.Tests.Controllers
{
    public class SiteUpdatesControllerTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly SiteUpdatesController _controller;
        private readonly Cloudinary _dummyCloudinary;

        public SiteUpdatesControllerTests()
        {
            // 1. Setup In-Memory Database (Unique name per instance ensures test isolation)
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new AppDbContext(options);

            // 2. Setup a Dummy Cloudinary Instance
            var account = new Account("dummy_cloud", "dummy_key", "dummy_secret");
            _dummyCloudinary = new Cloudinary(account);

            // 3. Instantiate the Controller
            _controller = new SiteUpdatesController(_context, _dummyCloudinary);
        }

        // Expanded helper to mock both standard logged-in user and custom Roles
        private void SetCurrentUser(string userId, string roleId = null)
        {
            var claims = new List<Claim> { new Claim(ClaimTypes.NameIdentifier, userId) };
            if (!string.IsNullOrEmpty(roleId))
            {
                claims.Add(new Claim("RoleID", roleId));
            }

            var user = new ClaimsPrincipal(new ClaimsIdentity(claims, "mock"));

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = user }
            };
        }

        [Fact]
        public async Task GetUpdates_ReturnsMappedUpdatesWithReactionsAndComments()
        {
            // Arrange
            var projectId = 1;
            var userId = "user-123";

            _context.Users.Add(new User { Id = userId, FullName = "John Doe" });

            var update = new ProjectUpdate
            {
                Id = 10,
                ProjectId = projectId,
                UserId = userId,
                Caption = "Site poured today",
                CreatedAt = DateTime.UtcNow
            };
            _context.ProjectUpdates.Add(update);

            _context.UpdateReactions.Add(new UpdateReaction { Id = 1, UpdateId = 10, UserId = userId, Emoji = "👍" });
            _context.UpdateComments.Add(new UpdateComment { Id = 1, UpdateId = 10, UserId = userId, CommentText = "Looks good!" });

            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetUpdates(projectId);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var payload = Assert.IsAssignableFrom<IEnumerable<ProjectDiscussionPostDto>>(okResult.Value);
            
            var posts = payload.ToList();
            Assert.Single(posts);
            
            var post = posts.First();
            Assert.Equal("John Doe", post.UserFullName);
            Assert.Equal("Site poured today", post.Caption);
            
            Assert.Single(post.Reactions);
            Assert.Equal("👍", post.Reactions.First().Emoji);
            Assert.Equal("John Doe", post.Reactions.First().UserFullName);

            Assert.Single(post.Comments);
            Assert.Equal("Looks good!", post.Comments.First().CommentText);
        }

        [Fact]
        public async Task GetUpdates_UserMapFallback_ReturnsUnknownUserString()
        {
            // Arrange: Seed data but DO NOT seed a corresponding User profile
            var projectId = 5;
            var update = new ProjectUpdate { Id = 50, ProjectId = projectId, UserId = "ghost-user", Caption = "Ghost update" };
            _context.ProjectUpdates.Add(update);
            _context.UpdateReactions.Add(new UpdateReaction { Id = 5, UpdateId = 50, UserId = "ghost-user", Emoji = "😮" });
            _context.UpdateComments.Add(new UpdateComment { Id = 5, UpdateId = 50, UserId = "ghost-user", CommentText = "Ghost comment" });
            await _context.SaveChangesAsync();

            // Act
            var result = await _controller.GetUpdates(projectId);

            // Assert: Verify the 'Unknown user' fallback branch runs
            var okResult = Assert.IsType<OkObjectResult>(result);
            var posts = Assert.IsAssignableFrom<IEnumerable<ProjectDiscussionPostDto>>(okResult.Value).ToList();
            
            Assert.Equal("Unknown user", posts.First().UserFullName);
            Assert.Equal("Unknown user", posts.First().Reactions.First().UserFullName);
            Assert.Equal("Unknown user", posts.First().Comments.First().UserFullName);
        }

        [Fact]
        public async Task CreateUpdate_WithoutImage_CreatesAndReturnsUpdate()
        {
            // Arrange
            var userId = "user-123";
            SetCurrentUser(userId);

            var dto = new CreateUpdateDto
            {
                Caption = "Progress check",
                Image = null
            };

            // Act
            var result = await _controller.CreateUpdate(1, dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var createdUpdate = Assert.IsType<ProjectUpdate>(okResult.Value);

            Assert.Equal("Progress check", createdUpdate.Caption);
            Assert.Equal(string.Empty, createdUpdate.ImageUrl);
            Assert.Equal(userId, createdUpdate.UserId);
            Assert.Equal(1, _context.ProjectUpdates.Count());
        }

        [Fact]
        public async Task React_TogglesReaction_AddsThenRemoves()
        {
            // Arrange
            var userId = "user-123";
            SetCurrentUser(userId);
            var updateId = 10;
            var emoji = "🔥";

            var dto = new ReactDto { Emoji = emoji };

            // Act 1: Add Reaction
            var addResult = await _controller.React(updateId, dto);
            
            // Assert 1
            var addOkResult = Assert.IsType<OkObjectResult>(addResult);
            var addResponse = addOkResult.Value?.GetType().GetProperty("removed")?.GetValue(addOkResult.Value, null);
            Assert.Equal(false, addResponse);
            Assert.Single(_context.UpdateReactions);

            // Act 2: Toggle Reaction (Remove)
            var removeResult = await _controller.React(updateId, dto);

            // Assert 2
            var removeOkResult = Assert.IsType<OkObjectResult>(removeResult);
            var removeResponse = removeOkResult.Value?.GetType().GetProperty("removed")?.GetValue(removeOkResult.Value, null);
            Assert.Equal(true, removeResponse);
            Assert.Empty(_context.UpdateReactions);
        }

        [Fact]
        public async Task AddComment_ValidData_AddsCommentToDatabase()
        {
            // Arrange
            var userId = "user-123";
            SetCurrentUser(userId);
            var updateId = 10;

            var dto = new CommentDto { CommentText = "Great progress!" };

            // Act
            var result = await _controller.AddComment(updateId, dto);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var comment = Assert.IsType<UpdateComment>(okResult.Value);

            Assert.Equal("Great progress!", comment.CommentText);
            Assert.Equal(userId, comment.UserId);
            Assert.Equal(updateId, comment.UpdateId);
        }

        // ==================== DELETE UPDATE BRANCH TESTS ====================

        [Fact]
        public async Task DeleteUpdate_NotFound_ReturnsNotFound()
        {
            // Arrange
            SetCurrentUser("any-user");

            // Act
            var result = await _controller.DeleteUpdate(99999);

            // Assert
            var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
            Assert.Equal("Update not found.", notFoundResult.Value);
        }

        [Fact]
        public async Task DeleteUpdate_NotAuthorAndNotAdmin_ReturnsForbid()
        {
            // Arrange: Seed update owned by user-A
            var update = new ProjectUpdate { Id = 20, ProjectId = 1, UserId = "user-A", Caption = "Secure Post" };
            _context.ProjectUpdates.Add(update);
            await _context.SaveChangesAsync();

            // Set current session to user-B with a standard non-admin role ("3")
            SetCurrentUser("user-B", "3");

            // Act
            var result = await _controller.DeleteUpdate(20);

            // Assert
            var forbidResult = Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task DeleteUpdate_IsAuthor_DeletesSuccessfully()
        {
            // Arrange
            var update = new ProjectUpdate { Id = 21, ProjectId = 1, UserId = "author-user", Caption = "My Post" };
            _context.ProjectUpdates.Add(update);
            await _context.SaveChangesAsync();

            SetCurrentUser("author-user", "3");

            // Act
            var result = await _controller.DeleteUpdate(21);

            // Assert
            Assert.IsType<NoContentResult>(result);
            Assert.Null(await _context.ProjectUpdates.FindAsync(21));
        }

        [Fact]
        public async Task DeleteUpdate_IsAdmin_DeletesSuccessfully()
        {
            // Arrange: Post belongs to a regular user
            var update = new ProjectUpdate { Id = 22, ProjectId = 1, UserId = "regular-user", Caption = "User Post" };
            _context.ProjectUpdates.Add(update);
            await _context.SaveChangesAsync();

            // Session is an entirely different user, but has Admin RoleID "1"
            SetCurrentUser("admin-user", "1");

            // Act
            var result = await _controller.DeleteUpdate(22);

            // Assert
            Assert.IsType<NoContentResult>(result);
            Assert.Null(await _context.ProjectUpdates.FindAsync(22));
        }

        // ==================== DELETE COMMENT BRANCH TESTS ====================

        [Fact]
        public async Task DeleteComment_NotFound_ReturnsNotFound()
        {
            // Arrange
            SetCurrentUser("any-user");

            // Act
            var result = await _controller.DeleteComment(1, 99999);

            // Assert
            var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
            Assert.Equal("Comment not found.", notFoundResult.Value);
        }

        [Fact]
        public async Task DeleteComment_NotAuthorAndNotAdmin_ReturnsForbid()
        {
            // Arrange: Seed comment owned by user-A
            var comment = new UpdateComment { Id = 30, UpdateId = 1, UserId = "user-A", CommentText = "Nice" };
            _context.UpdateComments.Add(comment);
            await _context.SaveChangesAsync();

            // Session is user-B (not owner, not admin)
            SetCurrentUser("user-B", "3");

            // Act
            var result = await _controller.DeleteComment(1, 30);

            // Assert
            Assert.IsType<ForbidResult>(result);
        }

        [Fact]
        public async Task DeleteComment_IsAuthor_DeletesSuccessfully()
        {
            // Arrange
            var comment = new UpdateComment { Id = 31, UpdateId = 2, UserId = "comment-author", CommentText = "My Comment" };
            _context.UpdateComments.Add(comment);
            await _context.SaveChangesAsync();

            SetCurrentUser("comment-author", "3");

            // Act
            var result = await _controller.DeleteComment(2, 31);

            // Assert
            Assert.IsType<NoContentResult>(result);
            Assert.Null(await _context.UpdateComments.FindAsync(31));
        }

        [Fact]
        public async Task DeleteComment_IsOwnerRole_DeletesSuccessfully()
        {
            // Arrange
            var comment = new UpdateComment { Id = 32, UpdateId = 2, UserId = "regular-user", CommentText = "User Comment" };
            _context.UpdateComments.Add(comment);
            await _context.SaveChangesAsync();

            // Session belongs to an executive manager with Owner RoleID "4"
            SetCurrentUser("owner-user", "4");

            // Act
            var result = await _controller.DeleteComment(2, 32);

            // Assert
            Assert.IsType<NoContentResult>(result);
            Assert.Null(await _context.UpdateComments.FindAsync(32));
        }

        // ==================== GENERAL AUTHENTICATION TESTS ====================

        [Fact]
        public async Task UnauthenticatedUser_ReturnsUnauthorized()
        {
            // Arrange: Explicitly clearing out user identities
            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };

            // Act
            var createResult = await _controller.CreateUpdate(1, new CreateUpdateDto());
            var reactResult = await _controller.React(1, new ReactDto());
            var commentResult = await _controller.AddComment(1, new CommentDto());
            var deleteUpdateResult = await _controller.DeleteUpdate(1);
            var deleteCommentResult = await _controller.DeleteComment(1, 1);

            // Assert
            Assert.IsType<UnauthorizedResult>(createResult);
            Assert.IsType<UnauthorizedResult>(reactResult);
            Assert.IsType<UnauthorizedResult>(commentResult);
            Assert.IsType<UnauthorizedResult>(deleteUpdateResult);
            Assert.IsType<UnauthorizedResult>(deleteCommentResult);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}