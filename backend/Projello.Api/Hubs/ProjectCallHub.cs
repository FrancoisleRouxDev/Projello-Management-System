// NOTE: This file will contain the SignalR hub for project voice/video calls (join/leave room, offer/answer exchange, ICE candidate relay, and participant presence events).

using Microsoft.AspNetCore.SignalR;

namespace Projello.Api.Hubs;

public sealed class ProjectCallHub : Hub
{
    // This hub will handle real-time communication for project calls, including:
    // - Joining/leaving call rooms
    // - Exchanging WebRTC offers/answers and ICE candidates
    // - Broadcasting participant presence updates (join/leave notifications)
}