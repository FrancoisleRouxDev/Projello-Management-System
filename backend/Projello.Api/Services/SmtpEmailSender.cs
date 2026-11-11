using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using Projello.Api.Configuration;

namespace Projello.Api.Services;

public sealed class SmtpEmailSender(IOptions<EmailSettings> options) : IEmailSender
{
    private readonly EmailSettings _settings = options.Value;

    public async Task SendPasswordResetAsync(
        string recipientEmail,
        string recipientName,
        string resetLink,
        CancellationToken cancellationToken)
    {
        ValidateConfiguration();

        using var message = new MailMessage
        {
            From = new MailAddress(_settings.FromEmail, _settings.FromName),
            Subject = "Reset your Projello password",
            Body = $"""
                Hello {recipientName},

                We received a request to reset your Projello password.
                Use the link below within 1 hour:

                {resetLink}

                If you did not request this, you can safely ignore this email.
                """,
            IsBodyHtml = false
        };
        message.To.Add(recipientEmail);

        using var client = new SmtpClient(_settings.SmtpHost, _settings.SmtpPort)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(_settings.SmtpUsername, _settings.SmtpPassword)
        };

#pragma warning disable SYSLIB0014
        await client.SendMailAsync(message, cancellationToken);
#pragma warning restore SYSLIB0014
    }

    private void ValidateConfiguration()
    {
        if (string.IsNullOrWhiteSpace(_settings.SmtpHost) ||
            string.IsNullOrWhiteSpace(_settings.SmtpUsername) ||
            string.IsNullOrWhiteSpace(_settings.SmtpPassword) ||
            string.IsNullOrWhiteSpace(_settings.FromEmail) ||
            string.IsNullOrWhiteSpace(_settings.FrontendBaseUrl))
        {
            throw new InvalidOperationException("Password reset email is not configured.");
        }
    }
}
