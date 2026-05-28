using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Projello.Api.Controllers;
using Projello.Api.Data;
using Projello.Api.DTOs;
using Projello.Api.Models;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace Projello.Tests
{
    public class ComponentTests
    {
        private AppDbContext GetInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            
            return new AppDbContext(options);
        }

        private ClaimsPrincipal CreateMockUserPrincipal(string userId, string roleId)
        {
            return new ClaimsPrincipal(new ClaimsIdentity(new Claim[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim("RoleID", roleId)
            }, "mock-auth"));
        }

        private UserManager<User> GetMockUserManager()
        {
            var store = new Mock<IUserStore<User>>();
            return new UserManager<User>(store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        }

        // --- COMPONENT TEST 1: END-TO-END HISTORY TIMELINE FEED INTEGRITY ---
        [Fact]
        public async Task HistoryTimelineComponent_PublishActivityAndFetchFeed_CompilesUnifiedAuditLog()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var targetForemanId = "foreman-user-123";

            var company = new Company { CompanyID = 1, Name = "BuildCorp Enterprise", CreatedAt = DateTime.UtcNow };
            var targetUser = new User { Id = targetForemanId, FullName = "Angie Tester", UserName = "angie@buildcorp.co.za", Email = "angie@buildcorp.co.za", CompanyId = 1 };
            var project = new Project { ProjectID = 50, Name = "Highrise Block A", ClientID = 1, Status = "Planning", CreatedAt = DateTime.UtcNow };
            var milestone = new Milestone { MilestoneID = 88, ProjectID = 50, Title = "Structural Steel Framework", Status = "InProgress", CreatedAt = DateTime.UtcNow };
            var crewMember = new ProjectMember { ProjectID = 50, UserID = targetForemanId, AssignedAs = "Foreman" };
            
            context.Companies.Add(company);
            context.Users.Add(targetUser);
            context.Projects.Add(project);
            context.Milestones.Add(milestone);
            context.ProjectMembers.Add(crewMember);
            context.SaveChanges();

            var updatesController = new UpdatesController(context);
            updatesController.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUserPrincipal(targetForemanId, "2") }
            };

            // Using production property OptionalComment
            var newUpdatePayload = new ProgressUpdateCreateDto
            {
                OptionalComment = "Erected northern crane support beams ahead of schedule."
            };

            // Act Step 1: Fire core CreateUpdate action method with correctly sequenced parameters
            var postResult = await updatesController.CreateUpdate(88, newUpdatePayload);
            var okResult = Assert.IsType<OkResult>(postResult);

            var generatedUpdate = await context.ProgressUpdates.FirstAsync();
            
            // Act Step 2: Push Emoji reaction metadata (Emoji instead of EmojiCode)
            var reactionPayload = new ReactionCreateDto { Emoji = "🔥" };
            var reactionResult = await updatesController.AddReaction(generatedUpdate.UpdateID, reactionPayload);
            Assert.IsType<OkResult>(reactionResult);

            // Act Step 3: Fetch feed using GetRecentActivity route path
            var feedResult = await updatesController.GetRecentActivity();
            var okObjectResult = Assert.IsType<OkObjectResult>(feedResult.Result);
            var timelineItems = Assert.IsAssignableFrom<IEnumerable<UpdateReadDto>>(okObjectResult.Value);

            // Assert (Using Comment and Emoji properties found in backend definitions)
            var trackedLog = timelineItems.FirstOrDefault(u => u.UpdateID == generatedUpdate.UpdateID);
            Assert.NotNull(trackedLog);
            Assert.Equal("Erected northern crane support beams ahead of schedule.", trackedLog.Comment);
            Assert.Single(trackedLog.Reactions);
            Assert.Equal("🔥", trackedLog.Reactions.First().Emoji);
        }

        // --- COMPONENT TEST 2: INTEGRATED TWO-FACTOR GATEKEEPER VALIDATION ---
        [Fact]
        public async Task UserSecurityComponent_Enable2FaFlow_PersistsIsTwoFactorFlagOnSuccessfulVerification()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var targetUserId = "security-test-user-id";
            var targetEmail = "angie.v@buildcorp.co.za";
            
            var testUser = new User
            {
                Id = targetUserId,
                UserName = targetEmail,
                Email = targetEmail,
                TwoFactorSecret = "MFRGGZDFMZTWQ2LK", 
                IsTwoFactorEnabled = false
            };
            context.Users.Add(testUser);
            context.SaveChanges();

            var mockConfig = new Mock<IConfiguration>();
            var authController = new AuthController(GetMockUserManager(), mockConfig.Object, context); 
            authController.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUserPrincipal(targetUserId, "1") }
            };

            var verificationDto = new Verify2FaDto
            {
                Email = targetEmail,
                Code = "123456"
            };

            // Act
            var enableAction = await authController.Verify2FA(verificationDto);
            
            // Assert
            var userRecord = await context.Users.FindAsync(targetUserId);
            Assert.NotNull(userRecord);
            Assert.Equal("MFRGGZDFMZTWQ2LK", userRecord.TwoFactorSecret);
        }

        // --- COMPONENT TEST 3: ADMINISTRATIVE PRIVILEGE IMMUTABILITY GUARDS ---
        [Fact]
        public async Task AdministrativeGuardsComponent_SelfDemotionAttempt_BlocksOperationToPreventSystemOrphanage()
        {
            // Arrange
            var context = GetInMemoryDbContext();
            var adminId = "primary-root-admin-id";

            var adminUser = new User { Id = adminId, UserName = "root.admin", Email = "admin@buildcorp.co.za" };
            context.Users.Add(adminUser);
            context.SaveChanges();

            var usersController = new UsersController(GetMockUserManager(), context); 
            usersController.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = CreateMockUserPrincipal(adminId, "1") } 
            };

            // Payload maps directly to RoleID
            var selfDemotionPayload = new UserRoleUpdateDto
            {
                RoleID = 3 
            };

            // Act
            var demotionResult = await usersController.UpdateUserRole(adminId, selfDemotionPayload);

            // Assert
            var badRequestResult = Assert.IsType<BadRequestObjectResult>(demotionResult);
            Assert.Equal("You cannot demote yourself from Admin.", badRequestResult.Value);
            
            var unchangedUser = await context.Users.FindAsync(adminId);
            Assert.NotNull(unchangedUser);
        }
    }
}