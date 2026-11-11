namespace Projello.Api.Services;

public interface IEmailSender
{
    Task SendPasswordResetAsync(string recipientEmail, string recipientName, string resetLink, CancellationToken cancellationToken);
}
