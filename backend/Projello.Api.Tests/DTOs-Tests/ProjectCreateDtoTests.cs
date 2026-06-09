using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Projello.Api.DTOs;
using Xunit;

namespace Projello.Api.Tests.DTOs
{
    public class ProjectCreateDtoTests
    {
        // --- HELPER METHOD ---
        // Simulates the API validating the model
        private IList<ValidationResult> ValidateModel(object model)
        {
            var results = new List<ValidationResult>();
            var validationContext = new ValidationContext(model, null, null);
            Validator.TryValidateObject(model, validationContext, results, true);
            return results;
        }

        [Fact]
        public void ProjectCreateDto_ValidData_PassesValidation()
        {
            // Arrange
            var dto = new ProjectCreateDto 
            { 
                Name = "New Office Build", 
                ClientID = 10,
                Description = "Building a new office downtown",
                StartDate = new DateOnly(2026, 1, 1),
                DueDate = new DateOnly(2026, 12, 31)
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.Empty(errors); // Proves a fully valid model passes
        }

        [Fact]
        public void ProjectCreateDto_MissingName_FailsValidation()
        {
            // Arrange
            var dto = new ProjectCreateDto 
            { 
                ClientID = 10 // Name is left out (null)
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Name"));
            // Bonus: Prove it returns your custom error message!
            Assert.Contains(errors, e => e.ErrorMessage == "Project name is required");
        }

        [Fact]
        public void ProjectCreateDto_NameExceedsMaxLength_FailsValidation()
        {
            // Arrange
            var excessivelyLongName = new string('A', 201); // 201 characters long
            var dto = new ProjectCreateDto 
            { 
                Name = excessivelyLongName,
                ClientID = 10 
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Name")); // Proves [MaxLength(200)] works
        }
    }
}