// NOTE: This file contains the backend configuration models for WebRTC ICE servers (STUN/TURN URLs, optional username, and credential fields).


namespace Projello.Api.Models;

// Binds to the "WebRtc" section in appsettings and holds the list of ICE servers sent to clients.
public sealed class WebRtcOptions
{
	// Shared key name used in Program.cs when reading configuration.
	public const string SectionName = "WebRtc";

	// STUN/TURN server entries that WebRTC peers will use for NAT traversal.
	public List<IceServer> IceServers { get; init; } = [];
}

// Represents one ICE server entry (STUN or TURN).
public sealed class IceServer
{
	// One or more server URLs, e.g. stun:... or turn:... .
	public string[] Urls { get; init; } = [];
	// Optional TURN username; usually null for STUN-only entries.
	public string? Username { get; init; }
	// Optional TURN credential/password paired with Username.
	public string? Credential { get; init; }
}

