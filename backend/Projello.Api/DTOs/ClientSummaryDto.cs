using System.ComponentModel.DataAnnotations;

namespace Projello.Api.DTOs
{
    public class ClientSummaryDto
    {
        //Null if not available
        public decimal? TotalRevenue { get; set; }
        public decimal? Outstanding { get; set; }

        public int ActiveClients { get; set; }
        public int BlacklistClients { get; set; }
        
    }
}