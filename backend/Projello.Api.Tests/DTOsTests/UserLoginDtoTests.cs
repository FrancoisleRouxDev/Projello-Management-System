using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Projello.Api.DTOs;
using Xunit;

namespace Projello.Api.Tests.DTOs
{
    public class UserLoginDtoTests
    {
        // --- HELPER METHOD ---
        // Simulates the API automatically validating the model when a request comes in
        private IList<ValidationResult> ValidateModel(object model)
        {
            var results = new List<ValidationResult>();
            var validationContext = new ValidationContext(model, null, null);
            Validator.TryValidateObject(model, validationContext, results, true);
            return results;
        }

        [Fact]
        public void UserLoginDto_ValidData_PassesValidation()
        {
            // Arrange
            var dto = new UserLoginDto 
            { 
                Email = "user@example.com", 
                Password = "SuperSecretPassword123!" 
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.Empty(errors); // Proves a properly filled out DTO passes
        }

        [Fact]
        public void UserLoginDto_MissingEmail_FailsValidation()
        {
            // Arrange
            var dto = new UserLoginDto 
            { 
                Password = "SuperSecretPassword123!" 
            }; // Email is null

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Email")); // Proves the [Required] tag works
        }

        [Fact]
        public void UserLoginDto_InvalidEmailFormat_FailsValidation()
        {
            // Arrange
            var dto = new UserLoginDto 
            { 
                Email = "plainaddress", // Not a real email format
                Password = "SuperSecretPassword123!" 
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Email")); // Proves the [EmailAddress] tag works
        }

        [Fact]
        public void UserLoginDto_MissingPassword_FailsValidation()
        {
            // Arrange
            var dto = new UserLoginDto 
            { 
                Email = "user@example.com"
            }; // Password is null

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Password")); // Proves the [Required] tag works
        }
    }
}