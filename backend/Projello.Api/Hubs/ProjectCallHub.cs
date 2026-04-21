// NOTE: This file contains the SignalR hub for project voice/video calls.
// It handles room membership and relays WebRTC signaling payloads between peers.

using Microsoft.AspNetCore.SignalR;

namespace Projello.Api.Hubs;

public sealed class ProjectCallHub : Hub
{
	// Group names are scoped by project so each project has an isolated call room.
	private static string GetGroupName(string projectId) => $"project-call:{projectId}";

	// Prefer authenticated user identity when available; otherwise fall back to connection id.
	private string GetParticipantId() => Context.UserIdentifier ?? Context.ConnectionId;

	// Adds the current connection to a project's call group and notifies peers.
	public async Task JoinProjectCall(string projectId)
	{
		if (string.IsNullOrWhiteSpace(projectId))
			throw new HubException("Project id is required.");

		var groupName = GetGroupName(projectId);

		await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

		await Clients.GroupExcept(groupName, [Context.ConnectionId])
			.SendAsync("ParticipantJoined", projectId, Context.ConnectionId, GetParticipantId());

		await Clients.Caller
			.SendAsync("JoinedProjectCall", projectId, Context.ConnectionId, GetParticipantId());
	}

	// Removes the current connection from the project's call group and notifies peers.
	public async Task LeaveProjectCall(string projectId)
	{
		if (string.IsNullOrWhiteSpace(projectId))
			throw new HubException("Project id is required.");

		var groupName = GetGroupName(projectId);

		await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

		await Clients.Group(groupName)
			.SendAsync("ParticipantLeft", projectId, Context.ConnectionId, GetParticipantId());
	}

	// Relays a WebRTC offer SDP to a specific target connection.
	public async Task SendOffer(string projectId, string targetConnectionId, string offerSdp)
	{
		if (string.IsNullOrWhiteSpace(projectId))
			throw new HubException("Project id is required.");
		if (string.IsNullOrWhiteSpace(targetConnectionId))
			throw new HubException("Target connection id is required.");
		if (string.IsNullOrWhiteSpace(offerSdp))
			throw new HubException("Offer SDP is required.");

		await Clients.Client(targetConnectionId)
			.SendAsync("ReceiveOffer", projectId, Context.ConnectionId, GetParticipantId(), offerSdp);
	}

	// Relays a WebRTC answer SDP to a specific target connection.
	public async Task SendAnswer(string projectId, string targetConnectionId, string answerSdp)
	{
		if (string.IsNullOrWhiteSpace(projectId))
			throw new HubException("Project id is required.");
		if (string.IsNullOrWhiteSpace(targetConnectionId))
			throw new HubException("Target connection id is required.");
		if (string.IsNullOrWhiteSpace(answerSdp))
			throw new HubException("Answer SDP is required.");

		await Clients.Client(targetConnectionId)
			.SendAsync("ReceiveAnswer", projectId, Context.ConnectionId, GetParticipantId(), answerSdp);
	}

	// Relays a single ICE candidate to a specific target connection.
	public async Task SendIceCandidate(
		string projectId,
		string targetConnectionId,
		string candidate,
		string? sdpMid,
		int? sdpMLineIndex)
	{
		if (string.IsNullOrWhiteSpace(projectId))
			throw new HubException("Project id is required.");
		if (string.IsNullOrWhiteSpace(targetConnectionId))
			throw new HubException("Target connection id is required.");
		if (string.IsNullOrWhiteSpace(candidate))
			throw new HubException("ICE candidate is required.");

		await Clients.Client(targetConnectionId)
			.SendAsync(
				"ReceiveIceCandidate",
				projectId,
				Context.ConnectionId,
				GetParticipantId(),
				candidate,
				sdpMid,
				sdpMLineIndex);
	}
}

