using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Projello.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyInvites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CompanyInvites",
                columns: table => new
                {
                    InviteID = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "text", nullable: false),
                    CompanyID = table.Column<int>(type: "integer", nullable: false),
                    CreatedByUserId = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsUsed = table.Column<bool>(type: "boolean", nullable: false),
                    UsedByUserId = table.Column<string>(type: "text", nullable: true),
                    UsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CompanyInvites", x => x.InviteID);
                    table.ForeignKey(
                        name: "FK_CompanyInvites_Companies_CompanyID",
                        column: x => x.CompanyID,
                        principalTable: "Companies",
                        principalColumn: "CompanyID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CompanyInvites_CompanyID",
                table: "CompanyInvites",
                column: "CompanyID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CompanyInvites");
        }
    }
}
