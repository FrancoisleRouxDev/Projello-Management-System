// ProjectCallHub.cs  (Improved version)
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace Projello.Api.Hubs;

public sealed class ProjectCallHub : Hub
{
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

        var participants = _callParticipants.GetOrAdd(projectId, _ => new HashSet<string>());
        lock (participants)
        {
            participants.Add(Context.ConnectionId);
        }

        // Notify others in the group
        await Clients.GroupExcept(groupName, Context.ConnectionId)
            .SendAsync("ParticipantJoined", projectId, Context.ConnectionId, participantId);

        await Clients.Caller.SendAsync("JoinedProjectCall", 
            projectId, Context.ConnectionId, participantId, participants.ToList());

        Console.WriteLine($"[Hub] {participantId} joined project {projectId}");
    }

    public async Task LeaveProjectCall(string projectId)
    {
        var groupName = GetGroupName(projectId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

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

    // ==================== IMPROVED SIGNALING ====================

    public async Task SendOffer(string projectId, string targetConnectionId, string offerSdp)
    {
        var groupName = GetGroupName(projectId);
        Console.WriteLine($"[Hub] SendOffer from {Context.ConnectionId} to {targetConnectionId}");

        await Clients.Group(groupName)
            .SendAsync("ReceiveOffer", projectId, Context.ConnectionId, GetParticipantId(), offerSdp);
    }

    public async Task SendAnswer(string projectId, string targetConnectionId, string answerSdp)
    {
        var groupName = GetGroupName(projectId);
        Console.WriteLine($"[Hub] SendAnswer from {Context.ConnectionId} to {targetConnectionId}");

        await Clients.Group(groupName)
            .SendAsync("ReceiveAnswer", projectId, Context.ConnectionId, GetParticipantId(), answerSdp);
    }

    public async Task SendIceCandidate(
        string projectId, string targetConnectionId, 
        string candidate, string? sdpMid, int? sdpMLineIndex)
    {
        var groupName = GetGroupName(projectId);

        await Clients.Group(groupName)
            .SendAsync("ReceiveIceCandidate", projectId, Context.ConnectionId, 
                GetParticipantId(), candidate, sdpMid, sdpMLineIndex);
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