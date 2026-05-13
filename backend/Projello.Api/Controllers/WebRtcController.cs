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

        if (config.IceServers is null || config.IceServers.Count == 0)
        {
            return Problem(
                title: "WebRTC configuration missing",
                detail: "No ICE servers are configured.",
                statusCode: StatusCodes.Status500InternalServerError);
        }

        return Ok(config);
    }
    // This endpoint will return the WebRTC configuration (e.g. ICE servers) to authenticated clients.
}
