// ProjectCallHub.cs  (Path B - Stable Participant ID)
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace Projello.Api.Hubs;

public sealed class ProjectCallHub : Hub
{
    // participantId -> current ConnectionId
    private static readonly ConcurrentDictionary<string, string> _participantConnections = new();

    // projectId -> set of participantIds in the call
    private static readonly ConcurrentDictionary<string, HashSet<string>> _callParticipants = new();

    private static string GetGroupName(string projectId) => $"project-call:{projectId}";

    private string GetParticipantId() => Context.UserIdentifier ?? Context.ConnectionId;

    public async Task JoinProjectCall(string projectId)
    {
        if (string.IsNullOrWhiteSpace(projectId))
            throw new HubException("Project id is required.");

        var groupName = GetGroupName(projectId);
        var participantId = GetParticipantId();
        var connectionId = Context.ConnectionId;

        await Groups.AddToGroupAsync(connectionId, groupName);

        // Update mapping
        _participantConnections[participantId] = connectionId;

        var participants = _callParticipants.GetOrAdd(projectId, _ => new HashSet<string>());
        lock (participants)
        {
            participants.Add(participantId);
        }

        // Notify others
        await Clients.GroupExcept(groupName, connectionId)
            .SendAsync("ParticipantJoined", projectId, participantId);

        // Send current participants to the new joiner
        await Clients.Caller.SendAsync("JoinedProjectCall", 
            projectId, participantId, participants.ToList());
    }

    public async Task LeaveProjectCall(string projectId)
    {
        var groupName = GetGroupName(projectId);
        var participantId = GetParticipantId();

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

        _participantConnections.TryRemove(participantId, out _);

        if (_callParticipants.TryGetValue(projectId, out var participants))
        {
            lock (participants)
            {
                participants.Remove(participantId);
                if (participants.Count == 0)
                    _callParticipants.TryRemove(projectId, out _);
            }
        }

        await Clients.Group(groupName)
            .SendAsync("ParticipantLeft", projectId, participantId);
    }

    // ==================== SIGNALING USING participantId ====================

    public async Task SendOffer(string projectId, string targetParticipantId, string offerSdp)
    {
        if (_participantConnections.TryGetValue(targetParticipantId, out var targetConnectionId))
        {
            await Clients.Client(targetConnectionId)
                .SendAsync("ReceiveOffer", projectId, Context.ConnectionId, GetParticipantId(), offerSdp);
        }
    }

    public async Task SendAnswer(string projectId, string targetParticipantId, string answerSdp)
    {
        if (_participantConnections.TryGetValue(targetParticipantId, out var targetConnectionId))
        {
            await Clients.Client(targetConnectionId)
                .SendAsync("ReceiveAnswer", projectId, Context.ConnectionId, GetParticipantId(), answerSdp);
        }
    }

    public async Task SendIceCandidate(
        string projectId, 
        string targetParticipantId, 
        string candidate, 
        string? sdpMid, 
        int? sdpMLineIndex)
    {
        if (_participantConnections.TryGetValue(targetParticipantId, out var targetConnectionId))
        {
            await Clients.Client(targetConnectionId)
                .SendAsync("ReceiveIceCandidate", projectId, Context.ConnectionId, 
                    GetParticipantId(), candidate, sdpMid, sdpMLineIndex);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var participantId = GetParticipantId();
        _participantConnections.TryRemove(participantId, out _);

        foreach (var projectId in _callParticipants.Keys.ToList())
        {
            if (_callParticipants.TryGetValue(projectId, out var participants))
            {
                lock (participants)
                {
                    if (participants.Remove(participantId) && participants.Count == 0)
                    {
                        _callParticipants.TryRemove(projectId, out _);
                    }
                }
            }
        }

        await base.OnDisconnectedAsync(exception);
    }
}