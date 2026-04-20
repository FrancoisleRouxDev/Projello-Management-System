// NOTE: This file will contain API endpoints for exposing sanitized WebRTC runtime configuration (for example ICE server settings) to authenticated clients.

using System.Runtime.CompilerServices;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Projello.Api.Models;

namespace Projello.Api.Controllers;

[ApiController]
[Route("api/webrtc")]

public sealed class WebRtcController : ControllerBase
{
    private readonly IOptions<WebRtcOptions> _options;

    public WebRtcController(IOptions<WebRtcOptions> options)
    {
        _options = options;
    }

    [HttpGet("config")]
    public IActionResult GetConfig() => DayOfWeek(_options.Value);
    // This endpoint will return the WebRTC configuration (e.g. ICE servers) to authenticated clients.
}