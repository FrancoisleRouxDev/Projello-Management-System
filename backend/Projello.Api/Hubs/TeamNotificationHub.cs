using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Projello.Api.Hubs;

[Authorize]
public sealed class TeamNotificationHub : Hub
{
}