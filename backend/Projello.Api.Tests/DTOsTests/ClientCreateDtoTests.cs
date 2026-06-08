using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Projello.Api.DTOs;
using Xunit;

namespace Projello.Api.Tests.DTOs
{
    public class ClientCreateDtoTests
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
        public void ClientCreateDto_ValidData_PassesValidation()
        {
            // Arrange
            var dto = new ClientCreateDto 
            { 
                Name = "Acme Corp",
                Description = "A great client",
                Email = "contact@acme.com",
                Phone = "123-456-7890",
                Company = "Acme Corporation",
                Notes = "VIP client"
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.Empty(errors); // Proves a fully valid model passes
        }

        [Fact]
        public void ClientCreateDto_MissingName_FailsValidation()
        {
            // Arrange
            var dto = new ClientCreateDto 
            { 
                Email = "contact@acme.com" 
                // Name is missing
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Name"));
            Assert.Contains(errors, e => e.ErrorMessage == "Client name is required."); // Proves your custom message works
        }

        [Fact]
        public void ClientCreateDto_NameExceedsMaxLength_FailsValidation()
        {
            // Arrange
            var excessivelyLongName = new string('A', 151); // 151 characters long (limit is 150)
            var dto = new ClientCreateDto 
            { 
                Name = excessivelyLongName
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Name")); // Proves [MaxLength(150)] works
        }

        [Fact]
        public void ClientCreateDto_OptionalFieldsExceedMaxLength_FailsValidation()
        {
            // Arrange
            var excessivelyLongString = new string('B', 256); // 256 characters long (limit is 255)
            var dto = new ClientCreateDto 
            { 
                Name = "Valid Name",
                Email = excessivelyLongString, // Triggers [MaxLength(255)]
                Phone = excessivelyLongString  // Triggers [MaxLength(255)]
            };

            // Act
            var errors = ValidateModel(dto);

            // Assert
            Assert.NotEmpty(errors);
            Assert.Contains(errors, e => e.MemberNames.Contains("Email"));
            Assert.Contains(errors, e => e.MemberNames.Contains("Phone"));
        }
    }
}