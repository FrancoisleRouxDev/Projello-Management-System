using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using Projello.Api.Controllers;
using Projello.Api.Models;
using System.Collections.Generic;
using Xunit;


namespace Projello.Api.Tests
{
    public class WebRtcControllerTests
    {
        private WebRtcController CreateController(WebRtcOptions config)
        {
            var mockOptions = new Mock<IOptions<WebRtcOptions>>();
            mockOptions.Setup(x => x.Value).Returns(config);

            var controller = new WebRtcController(mockOptions.Object);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };
            return controller;
        }

        [Fact]
        public void GetConfig_ReturnsOk_WhenIceServersAreConfigured()
        {
            var config = new WebRtcOptions
            {
                IceServers = new List<IceServer>
                {
                    new IceServer 
                    { 
                        Urls = new[] { "stun:stun.l.google.com:19302" } 
                    }
                }
            };

            var controller = CreateController(config);
            var result = controller.GetConfig();

            var okResult = Assert.IsType<OkObjectResult>(result);
            var returned = Assert.IsType<WebRtcOptions>(okResult.Value);
            Assert.NotEmpty(returned.IceServers);
        }

        [Fact]
        public void GetConfig_ReturnsProblem_WhenNoIceServersConfigured()
        {
            var config = new WebRtcOptions 
            { 
                IceServers = new List<IceServer>() 
            };

            var controller = CreateController(config);
            var result = controller.GetConfig();

            var problem = Assert.IsType<ObjectResult>(result);
            Assert.Equal(StatusCodes.Status500InternalServerError, problem.StatusCode);
        }

        [Fact]
        public void Test_ReturnsWorkingMessage()
        {
            var controller = CreateController(new WebRtcOptions());
            var result = controller.Test();

            var ok = Assert.IsType<OkObjectResult>(result);
            Assert.Contains("WebRTC controller is working", ok.Value!.ToString());
        }
    }
}