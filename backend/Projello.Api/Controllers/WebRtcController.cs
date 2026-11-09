// NOTE: This file will contain API endpoints for exposing sanitized WebRTC runtime configuration (for example ICE server settings) to authenticated clients.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Projello.Api.Models;

namespace Projello.Api.Controllers;

[ApiController]
[Route("api/webrtc")]
[Authorize] // Require authentication for all WebRTC config endpoints

public sealed class WebRtcController : ControllerBase
{
    private readonly IOptions<WebRtcOptions> _options;

    public WebRtcController(IOptions<WebRtcOptions> options)
    {
        _options = options;
    }

    [HttpGet("config")]
    [ProducesResponseType(typeof(WebRtcOptions), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public IActionResult GetConfig()
    {
        var config = _options.Value;
        var iceServers = config.IceServers
            .Select(server => new IceServer
            {
                Urls = server.Urls
                    .Where(url => !string.IsNullOrWhiteSpace(url))
                    .ToArray(),
                Username = server.Username,
                Credential = server.Credential
            })
            .Where(server => server.Urls.Length > 0)
            .ToList();

        if (iceServers.Count == 0)
        {
            return Problem(
                title: "WebRTC configuration missing",
                detail: "No ICE servers are configured.",
                statusCode: StatusCodes.Status500InternalServerError);
        }

        return Ok(new WebRtcOptions { IceServers = iceServers });
    }
    // This endpoint will return the WebRTC configuration (e.g. ICE servers) to authenticated clients.

    [HttpGet("test")]
    public IActionResult Test()
    {
        return Ok(new { message = "WebRTC controller is working!" });
    }
}
