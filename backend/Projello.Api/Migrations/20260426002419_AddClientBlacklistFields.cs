using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Projello.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddClientBlacklistFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BlacklistReason",
                table: "Clients",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "BlacklistedAt",
                table: "Clients",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BlacklistedById",
                table: "Clients",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Clients_BlacklistedById",
                table: "Clients",
                column: "BlacklistedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Clients_AspNetUsers_BlacklistedById",
                table: "Clients",
                column: "BlacklistedById",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Clients_AspNetUsers_BlacklistedById",
                table: "Clients");

            migrationBuilder.DropIndex(
                name: "IX_Clients_BlacklistedById",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "BlacklistReason",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "BlacklistedAt",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "BlacklistedById",
                table: "Clients");
        }
    }
}
