/**
 * UserDisplayDto
 * 
 * WHY THIS FILE EXISTS:
 * =====================
 * Frontend and backend are separate applications:
 * - Backend: .NET (C#) - compiled to DLL, not directly accessible to frontend
 * - Frontend: TypeScript/React - cannot import C# classes directly
 * 
 * TypeScript types are stripped at compile time and don't exist at runtime,
 * so they cannot be shared between projects written in different languages.
 * 
 * BEST PRACTICE:
 * When you receive JSON responses from your API, the frontend must define
 * TypeScript interfaces that match the backend DTO shape. This is essentially
 * a "contract" between frontend and backend.
 * 
 * Mirrors backend: backend/Projello.Api/DTOs/UserDisplayDto.cs
 * Used in: Workers page, and any other pages displaying user data
 * 
 * IMPORTANT: If the backend UserDisplayDto changes, you must manually update
 * this TypeScript interface to match. Consider documenting this in your
 * backend PR/commit notes so frontend developers are aware.
 * 
 * FUTURE IMPROVEMENT:
 * Consider using OpenAPI/Swagger generation to auto-generate these types
 * from your backend API spec to keep them in sync automatically.
 */
export interface UserDisplayDto {
	id: string;
	fullName: string;
	email: string;
	roleID: number;
	isTwoFactorEnabled: boolean;
}
