using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Projello.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyIdToClient : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompanyID",
                table: "Clients",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Clients_CompanyID",
                table: "Clients",
                column: "CompanyID");

            migrationBuilder.AddForeignKey(
                name: "FK_Clients_Companies_CompanyID",
                table: "Clients",
                column: "CompanyID",
                principalTable: "Companies",
                principalColumn: "CompanyID",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Clients_Companies_CompanyID",
                table: "Clients");

            migrationBuilder.DropIndex(
                name: "IX_Clients_CompanyID",
                table: "Clients");

            migrationBuilder.DropColumn(
                name: "CompanyID",
                table: "Clients");
        }
    }
}
