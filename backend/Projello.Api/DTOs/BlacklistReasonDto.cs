namespace Projello.Api.DTOs
{
    // Sent by admin when blacklisting a client
    public class BlacklistClientDto
    {
        public string? Reason { get; set; }
    }
}