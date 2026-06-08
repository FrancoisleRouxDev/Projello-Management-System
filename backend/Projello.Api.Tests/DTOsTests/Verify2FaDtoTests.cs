using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Projello.Api.DTOs;
using Xunit;

namespace Projello.Api.Tests.DTOs
{
    public class Verify2FaDtoTests
    {
        // --- HELPER METHOD ---
        // Simulates the API automatically validating the model
        private IList<ValidationResult> ValidateModel(object model)
        {
            var results = new List<ValidationResult>();
            var validationContext = new ValidationContext(model, null, null);
            Validator.TryValidateObject(model, validationContext, results, true);
            return results;
        }

        [Fact]
        public void Verify2FaDto_ValidData_PassesValidation()
        {
            // Arrange
            var dto = new Verify2FaDto 
            { 
                Email = "secureuser@example.com",
                Code = "123456"
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.Empty(errors); // Proves valid data passes seamlessly
        }

        [Fact]
        public void Verify2FaDto_MissingEmail_FailsValidation()
        {
            // Arrange
            var dto = new Verify2FaDto 
            { 
                Code = "123456" 
                // Email is missing
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Email")); // Proves [Required] works
        }

        [Fact]
        public void Verify2FaDto_InvalidEmailFormat_FailsValidation()
        {
            // Arrange
            var dto = new Verify2FaDto 
            { 
                Email = "not-a-real-email", // Triggers [EmailAddress] rule
                Code = "123456"
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Email"));
        }

        [Fact]
        public void Verify2FaDto_MissingCode_FailsValidation()
        {
            // Arrange
            var dto = new Verify2FaDto 
            { 
                Email = "secureuser@example.com"
                // Code is missing
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Code")); // Proves [Required] works
        }
    }
}