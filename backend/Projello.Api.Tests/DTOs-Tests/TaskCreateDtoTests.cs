using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Projello.Api.DTOs;
using Xunit;

namespace Projello.Api.Tests.DTOs
{
    public class TaskCreateDtoTests
    {
        // --- HELPER METHOD ---
        // Simulates the API validating the model automatically
        private IList<ValidationResult> ValidateModel(object model)
        {
            var results = new List<ValidationResult>();
            var validationContext = new ValidationContext(model, null, null);
            Validator.TryValidateObject(model, validationContext, results, true);
            return results;
        }

        [Fact]
        public void TaskCreateDto_ValidData_PassesValidation()
        {
            // Arrange
            var dto = new TaskCreateDto 
            { 
                MilestoneID = 1,
                Title = "Complete API Integration",
                Description = "Wire up the frontend to the new backend endpoints.",
                AssignedToUserID = "user-123",
                DueDate = new DateOnly(2026, 7, 1),
                Priority = "High"
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.Empty(errors); // Proves a fully valid model passes
        }

        [Fact]
        public void TaskCreateDto_MissingTitle_FailsValidation()
        {
            // Arrange
            var dto = new TaskCreateDto 
            { 
                MilestoneID = 1
                // Title is missing (null)
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Title")); // Proves [Required] works
        }

        [Fact]
        public void TaskCreateDto_TitleExceedsMaxLength_FailsValidation()
        {
            // Arrange
            var excessivelyLongTitle = new string('T', 256); // 256 characters long (limit is 255)
            var dto = new TaskCreateDto 
            { 
                MilestoneID = 1,
                Title = excessivelyLongTitle
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Title")); // Proves [MaxLength(255)] works
        }
    }
}