// ProjectCallHub.cs
using Microsoft.AspNetCore.SignalR;
using Projello.Api.Data;
using System.Collections.Concurrent;

namespace Projello.Api.Hubs;

public sealed class ProjectCallHub : Hub
{
    private readonly AppDbContext _dbContext;

    // Active calls: projectId -> set of participantIds
    private static readonly ConcurrentDictionary<string, HashSet<string>> _activeProjectCalls = new();

    public ProjectCallHub(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    private string GetParticipantId() => Context.UserIdentifier ?? Context.ConnectionId;

    public async Task JoinProjectCall(string projectId)
    {
        if (string.IsNullOrWhiteSpace(projectId))
            throw new HubException("Project id is required.");

        var userId = Context.UserIdentifier;
        if (string.IsNullOrEmpty(userId))
            throw new HubException("User not authenticated.");

        // === Authorization: Only project members can join ===
        bool isMember = _dbContext.ProjectMembers
            .Any(m => m.ProjectID == int.Parse(projectId) && m.UserID == userId);

        if (!isMember)
            throw new HubException("You are not a member of this project.");

        var groupName = $"project-call:{projectId}";
        var participantId = GetParticipantId();

        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

        // Track active call
        var participants = _activeProjectCalls.GetOrAdd(projectId, _ => new HashSet<string>());
        lock (participants)
        {
            participants.Add(participantId);
        }

        // Notify others in the project that someone joined
        await Clients.GroupExcept(groupName, Context.ConnectionId)
            .SendAsync("ParticipantJoined", projectId, participantId);

        // Send current state to the person who just joined
        await Clients.Caller.SendAsync("JoinedProjectCall", projectId, participantId, participants.ToList());

        Console.WriteLine($"[CallHub] {participantId} joined project call {projectId}");
    }

    public async Task LeaveProjectCall(string projectId)
    {
        var groupName = $"project-call:{projectId}";
        var participantId = GetParticipantId();

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);

        if (_activeProjectCalls.TryGetValue(projectId, out var participants))
        {
            lock (participants)
            {
                participants.Remove(participantId);
                if (participants.Count == 0)
                    _activeProjectCalls.TryRemove(projectId, out _);
            }
        }

        await Clients.Group(groupName)
            .SendAsync("ParticipantLeft", projectId, participantId);
    }

    // Simple direct signaling (more reliable)
    // Targeted signaling using User (correct way)
public async Task SendOffer(string projectId, string targetParticipantId, string offerSdp)
{
    await Clients.User(targetParticipantId)   //Changed from Clients.Client
        .SendAsync("ReceiveOffer", projectId, Context.ConnectionId, GetParticipantId(), offerSdp);
}

public async Task SendAnswer(string projectId, string targetParticipantId, string answerSdp)
{
    await Clients.User(targetParticipantId)
        .SendAsync("ReceiveAnswer", projectId, Context.ConnectionId, GetParticipantId(), answerSdp);
}

public async Task SendIceCandidate(string projectId, string targetParticipantId,
    string candidate, string? sdpMid, int? sdpMLineIndex)
{
    await Clients.User(targetParticipantId)
        .SendAsync("ReceiveIceCandidate", projectId, Context.ConnectionId,
            GetParticipantId(), candidate, sdpMid, sdpMLineIndex);
}

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var participantId = GetParticipantId();

        foreach (var projectId in _activeProjectCalls.Keys.ToList())
        {
            if (_activeProjectCalls.TryGetValue(projectId, out var participants))
            {
                lock (participants)
                {
                    if (participants.Remove(participantId) && participants.Count == 0)
                    {
                        _activeProjectCalls.TryRemove(projectId, out _);
                    }
                }
            }
        }

        await base.OnDisconnectedAsync(exception);
    }
}