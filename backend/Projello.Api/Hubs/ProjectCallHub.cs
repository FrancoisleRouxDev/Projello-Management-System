// NOTE: This file contains the SignalR hub for project voice/video calls.
// It handles room membership and relays WebRTC signaling payloads between peers.

using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace Projello.Api.Hubs;

public sealed class ProjectCallHub : Hub
{
    // Track active participants per project call (useful for knowing who to connect to)
    private static readonly ConcurrentDictionary<string, HashSet<string>> _callParticipants = new();

    private static string GetGroupName(string projectId) => $"project-call:{projectId}";

    private string GetParticipantId() => Context.UserIdentifier ?? Context.ConnectionId;

    public async Task JoinProjectCall(string projectId)
    {
        if (string.IsNullOrWhiteSpace(projectId))
            throw new HubException("Project id is required.");

        var groupName = GetGroupName(projectId);
        var participantId = GetParticipantId();

        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

        // Track participant
        var participants = _callParticipants.GetOrAdd(projectId, _ => new HashSet<string>());
        lock (participants)
        {
            participants.Add(Context.ConnectionId);
        }

        // Notify others
        await Clients.GroupExcept(groupName, Context.ConnectionId)
            .SendAsync("ParticipantJoined", projectId, Context.ConnectionId, participantId);

        // Tell the new user they joined + send current participants list
        await Clients.Caller.SendAsync("JoinedProjectCall", 
            projectId, 
            Context.ConnectionId, 
            participantId, 
            participants.ToList());
    }

    public async Task LeaveProjectCall(string projectId)
    {
        if (string.IsNullOrWhiteSpace(projectId))
            throw new HubException("Project id is required.");

        var groupName = GetGroupName(projectId);

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

        // Remove from tracking
        if (_callParticipants.TryGetValue(projectId, out var participants))
        {
            lock (participants)
            {
                participants.Remove(Context.ConnectionId);
                if (participants.Count == 0)
                    _callParticipants.TryRemove(projectId, out _);
            }
        }

        await Clients.Group(groupName)
            .SendAsync("ParticipantLeft", projectId, Context.ConnectionId, GetParticipantId());
    }

    public async Task SendOffer(string projectId, string targetConnectionId, string offerSdp)
    {
        if (string.IsNullOrWhiteSpace(targetConnectionId) || string.IsNullOrWhiteSpace(offerSdp))
            throw new HubException("Invalid offer data.");

        await Clients.Client(targetConnectionId)
            .SendAsync("ReceiveOffer", projectId, Context.ConnectionId, GetParticipantId(), offerSdp);
    }

    public async Task SendAnswer(string projectId, string targetConnectionId, string answerSdp)
    {
        if (string.IsNullOrWhiteSpace(targetConnectionId) || string.IsNullOrWhiteSpace(answerSdp))
            throw new HubException("Invalid answer data.");

        await Clients.Client(targetConnectionId)
            .SendAsync("ReceiveAnswer", projectId, Context.ConnectionId, GetParticipantId(), answerSdp);
    }

    public async Task SendIceCandidate(
        string projectId,
        string targetConnectionId,
        string candidate,
        string? sdpMid,
        int? sdpMLineIndex)
    {
        if (string.IsNullOrWhiteSpace(targetConnectionId) || string.IsNullOrWhiteSpace(candidate))
            throw new HubException("Invalid ICE candidate data.");

        await Clients.Client(targetConnectionId)
            .SendAsync("ReceiveIceCandidate",
                projectId,
                Context.ConnectionId,
                GetParticipantId(),
                candidate,
                sdpMid,
                sdpMLineIndex);
    }

    // Optional helper
    public async Task GetParticipants(string projectId)
    {
        if (_callParticipants.TryGetValue(projectId, out var participants))
        {
            await Clients.Caller.SendAsync("CurrentParticipants", projectId, participants.ToList());
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        foreach (var projectId in _callParticipants.Keys.ToList())
        {
            if (_callParticipants.TryGetValue(projectId, out var participants) && 
                participants.Contains(Context.ConnectionId))
            {
                await LeaveProjectCall(projectId);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }
}