using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Projello.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddIdentityTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_Tasks_TaskItemTaskID",
                table: "Attachments");

            migrationBuilder.DropIndex(
                name: "IX_Attachments_TaskItemTaskID",
                table: "Attachments");

            migrationBuilder.RenameColumn(
                name: "FileUrl",
                table: "Attachments",
                newName: "FileURL");

            migrationBuilder.RenameColumn(
                name: "TaskItemTaskID",
                table: "Attachments",
                newName: "UpdateID");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "Attachments",
                newName: "UploadedAt");

            migrationBuilder.AlterColumn<int>(
                name: "TaskID",
                table: "Attachments",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "FileURL",
                table: "Attachments",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "FileName",
                table: "Attachments",
                type: "character varying(255)",
                maxLength: 255,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FileType",
                table: "Attachments",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SizeBytes",
                table: "Attachments",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UploadedById",
                table: "Attachments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UploadedByUserID",
                table: "Attachments",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_TaskID",
                table: "Attachments",
                column: "TaskID");

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_UploadedById",
                table: "Attachments",
                column: "UploadedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_AspNetUsers_UploadedById",
                table: "Attachments",
                column: "UploadedById",
                principalTable: "AspNetUsers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_Tasks_TaskID",
                table: "Attachments",
                column: "TaskID",
                principalTable: "Tasks",
                principalColumn: "TaskID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_AspNetUsers_UploadedById",
                table: "Attachments");

            migrationBuilder.DropForeignKey(
                name: "FK_Attachments_Tasks_TaskID",
                table: "Attachments");

            migrationBuilder.DropIndex(
                name: "IX_Attachments_TaskID",
                table: "Attachments");

            migrationBuilder.DropIndex(
                name: "IX_Attachments_UploadedById",
                table: "Attachments");

            migrationBuilder.DropColumn(
                name: "FileName",
                table: "Attachments");

            migrationBuilder.DropColumn(
                name: "FileType",
                table: "Attachments");

            migrationBuilder.DropColumn(
                name: "SizeBytes",
                table: "Attachments");

            migrationBuilder.DropColumn(
                name: "UploadedById",
                table: "Attachments");

            migrationBuilder.DropColumn(
                name: "UploadedByUserID",
                table: "Attachments");

            migrationBuilder.RenameColumn(
                name: "FileURL",
                table: "Attachments",
                newName: "FileUrl");

            migrationBuilder.RenameColumn(
                name: "UploadedAt",
                table: "Attachments",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "UpdateID",
                table: "Attachments",
                newName: "TaskItemTaskID");

            migrationBuilder.AlterColumn<int>(
                name: "TaskID",
                table: "Attachments",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "FileUrl",
                table: "Attachments",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500);

            migrationBuilder.CreateIndex(
                name: "IX_Attachments_TaskItemTaskID",
                table: "Attachments",
                column: "TaskItemTaskID");

            migrationBuilder.AddForeignKey(
                name: "FK_Attachments_Tasks_TaskItemTaskID",
                table: "Attachments",
                column: "TaskItemTaskID",
                principalTable: "Tasks",
                principalColumn: "TaskID");
        }
    }
}
