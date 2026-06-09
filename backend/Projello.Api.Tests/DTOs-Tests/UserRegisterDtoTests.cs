using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Projello.Api.DTOs;
using Xunit;

namespace Projello.Api.Tests.DTOs
{
    public class UserRegisterDtoTests
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
        public void UserRegisterDto_ValidData_PassesValidation()
        {
            // Arrange
            var dto = new UserRegisterDto 
            { 
                FullName = "John Doe",
                Email = "john@example.com", 
                Password = "Password123!",
                RoleID = 2
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.Empty(errors); // No errors should be found
        }

        [Fact]
        public void UserRegisterDto_MissingEmail_FailsValidation()
        {
            // Arrange
            var dto = new UserRegisterDto 
            { 
                FullName = "John Doe",
                Password = "Password123!" 
            }; // Email is null

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Email"));
        }

        [Fact]
        public void UserRegisterDto_InvalidEmailFormat_FailsValidation()
        {
            // Arrange
            var dto = new UserRegisterDto 
            { 
                FullName = "John Doe",
                Email = "not-an-email-address", // Triggers [EmailAddress] rule
                Password = "Password123!" 
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Email"));
        }

        [Fact]
        public void UserRegisterDto_EmailExceedsMaxLength_FailsValidation()
        {
            // Arrange
            var excessivelyLongEmail = new string('a', 250) + "@test.com"; // Triggers [MaxLength(256)]
            var dto = new UserRegisterDto 
            { 
                FullName = "John Doe",
                Email = excessivelyLongEmail, 
                Password = "Password123!" 
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Email"));
        }

        [Fact]
        public void UserRegisterDto_MissingPassword_FailsValidation()
        {
            // Arrange
            var dto = new UserRegisterDto 
            { 
                FullName = "John Doe",
                Email = "john@example.com"
            }; // Password is null

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Password"));
        }

        [Fact]
        public void UserRegisterDto_PasswordTooShort_FailsValidation()
        {
            // Arrange
            var dto = new UserRegisterDto 
            { 
                FullName = "John Doe",
                Email = "john@example.com",
                Password = "short" // Triggers [MinLength(8)]
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Password"));
        }
    }
}