using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Projello.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFinancialsToProjectTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Outstanding",
                table: "Projects",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalPaid",
                table: "Projects",
                type: "numeric",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Outstanding",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "TotalPaid",
                table: "Projects");
        }
    }
}
