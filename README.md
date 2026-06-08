# Projello

## Lightweight Project Management System Built for the Construction Industry

---

## 📄 Description

Projello is a tailored, functional-first project management system designed specifically to bridge the gap between heavy, bloated enterprise project management software and the fast-paced, high-pressure execution environment of the construction and project-based services sector.

Built with a signature professional sage green visual identity designed for high outdoor visibility, Projello eliminates feature bloat in favour of streamlined, targeted workflows. The application introduces specialised on-site interfaces, such as a 30-second daily worker check-in panel, hierarchical milestone tracking, on-site media proof collection, and transparent client visibility layers.

Developed by Team Cepression for the Interactive Development 300 module at the Open Window Institute (2026), Projello empowers project managers, site crews, and external clients to align effectively on structural deliverables without being overwhelmed by administrative overhead.

---

## 🎯 Project Overview

In industries such as construction, generic agile project tracking tools (e.g. Jira and Trello) often fail because they expect workers in the field to manage complex card configurations, story points, and lengthy text-based documentation.

Field crews and contractors require immediate, low-friction entry pathways to signal roadblock states or record on-site milestone achievements without excessive administrative burden.

Projello was designed specifically to address these challenges by prioritising speed, clarity, and usability in real-world construction environments.

---

## 👤 Our Client

Our primary stakeholder and client for this system is **William Basson**, operating within the construction and project-based services sector.

The client manages multiple active teams and physical sites simultaneously. Because traditional project management tools were identified as poorly aligned with the realities of on-site manual execution, a custom software solution became necessary to centralise tracking, verify on-site completions, and manage client context profiles effectively.

Projello operates on a strict **Functional-First Philosophy** and introduces a hierarchical data ecosystem tailored to construction contract structures:

```plaintext
Client
 └── Project
      └── Milestone
           └── Task
```

This structural domain is supported by role-based access controls that secure visibility from corporate administrators through to site crew members and external stakeholders.

---

## 🛠️ Tech Stack & Architecture

Projello is built using a robust, decoupled client-server architecture designed to ensure environment consistency, high availability, and native desktop deployment lifecycle management.

---

### Presentation Layer (Frontend)

#### Core Technologies

* **UI Framework:** React 19 (TypeScript)
* **Desktop Runtime:** Electron Shell Wrapper
* **Build System:** Webpack and Electron Forge
* **Compilation Tooling:** `@electron-forge/cli`
* **Asset Management:**

  * `@vercel/webpack-asset-relocator-loader`
  * `css-loader`
  * `@svgr/webpack`

#### Real-Time Communication

* Native HTML5 WebRTC API
* SignalR Client Hub integration for real-time audio and video communication

#### Theming & Visual Identity

Projello uses a modular CSS architecture built around an optimised sage green palette designed to remain legible under direct sunlight and outdoor working conditions.

```css
--primary-sage-green: #4A6B52;
--light-background:   #EAF0EB;
--dark-slate-green:   #2C3E31;
--semantic-highlight: #F7F7F3;
```

---

### Service Infrastructure (Backend)

#### Core Technologies

* **API Framework:** ASP.NET Core 10.0 Web API
* **Programming Language:** C# 14 (.NET 10 SDK)
* **ORM:** Entity Framework Core 10
* **Database Engine:** PostgreSQL
* **Database Driver:** Npgsql

#### Identity & Security

* ASP.NET Core Identity
* JSON Web Token (JWT) Authentication
* BCrypt.Net-Next Password Hashing
* Otp.NET Two-Factor Authentication (2FA)

#### Real-Time Services

* ASP.NET Core SignalR Hub for WebRTC channel synchronisation

#### Cloud Infrastructure

* Docker containerisation
* Persistent cloud-hosted PostgreSQL infrastructure via Aiven Managed PostgreSQL

#### File & Media Management

* CloudinaryDotNet for image and media verification uploads

#### API Documentation

* Swashbuckle OpenAPI Swagger (6.x)

---

## ⚙️ Data Flow Example

### 1. React → API Communication

When a project manager assigns an on-site user to a project roster through `AddProjectMemberModal.tsx`, the frontend first retrieves available users from the API.

#### Fetch Available Users

```http
GET /api/users
```

The project manager selects a user and submits the assignment payload:

```json
{
  "userID": "5",
  "assignedAs": "Worker"
}
```

The authenticated JWT token is automatically attached to the request headers:

```http
Authorization: Bearer <token_string_here>
```

---

### 2. ASP.NET Controller Processing

The backend receives and validates the request through a protected API endpoint secured by JWT authentication.

```csharp
[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProjectsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("{id}/members")]
    public async Task<IActionResult> AddMember(
        int id,
        [FromBody] AddMemberDto dto)
    {
        var project = await _context.Projects.FindAsync(id);

        if (project == null)
            return NotFound(new
            {
                Message = "Project not found."
            });

        var newMember = new ProjectMember
        {
            ProjectId = id,
            UserId = dto.UserID,
            AssignedAs = dto.AssignedAs,
            CreatedAt = DateTime.UtcNow
        };

        _context.ProjectMembers.Add(newMember);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Member assigned successfully."
        });
    }
}
```

---

## ✅ Key Features

* Functional-first construction project management
* Native desktop application support via Electron
* Role-based access management
* JWT-secured authentication pipeline
* Two-factor authentication support
* Hierarchical project structures
* Milestone and task tracking
* On-site worker check-in workflows
* Client visibility and reporting layers
* Media proof collection and verification
* Real-time communication using SignalR and WebRTC
* Cloud-hosted PostgreSQL infrastructure
* Docker-based deployment architecture
* Swagger API documentation

---

## 🏗️ Project Vision

Projello aims to provide a focused, construction-specific project management solution that prioritises operational efficiency over feature complexity.

Rather than adapting generic software designed for software development teams, Projello delivers workflows intentionally built around the realities of construction projects, enabling project managers, site workers, contractors, and clients to collaborate through a streamlined and transparent platform.

## 3. Database Synchronisation & State Rehydration

Entity Framework Core translates the tracking sequence into a parameterised, highly efficient SQL statement executed against the Aiven Managed PostgreSQL database.

Upon successful commitment of the transaction, the backend API issues an HTTP `200 OK` confirmation payload.

The React runtime captures the successful response within `AddProjectMemberModal.tsx`, invokes the `onMemberAdded()` callback, updates local state arrays, and triggers an immediate interface re-render.

---

# ✨ Key Features

## ⏱️ 30-Second Daily Check-ins

A streamlined interface enabling field crews to update operational statuses, record concise notes, and report structural progress directly from site locations.

The system promotes lightweight communication by allowing crews to submit check-in commentary alongside non-intrusive emoji status reactions, limited to five predefined symbols.

---

## 🔐 Granular Role-Based Access Control (RBAC)

### Admin

* Full global system access
* Team and user profile management
* Company and client blacklist administration

### Foreman / Project Head

* Team coordination
* Milestone creation and management
* Task allocation
* Progress monitoring and reporting

### Worker / Builder

* View-only access to assigned projects
* Daily log submissions
* Photo upload permissions
* Reaction and feedback capabilities

### Client

* Restricted access to commissioned project information only
* No visibility into administrative functions
* Read-only project progress monitoring

---

## 📊 Hierarchical Milestone & Task Tracking

Interactive chronological timelines provide visibility into project progress, task configurations, deadlines, and milestone completion states.

Tasks are grouped systematically beneath milestones, allowing project managers and stakeholders to understand project progression at a glance.

---

## 🛡️ Hardened Security Core

Projello incorporates multiple security layers, including:

* JWT Bearer Authentication
* ASP.NET Identity integration
* Encrypted authentication workflows
* Secure invitation onboarding tokens
* Automated Two-Factor Authentication (2FA) via Otp.NET
* Role-based permission enforcement

---

## 📸 On-Site Photo Verification Uploads

A high-performance media pipeline integrated through Cloudinary enables field crews to capture and upload photographic evidence directly against project updates and milestone completions.

This provides transparent visual verification of work completed on site.

---

## 📞 Integrated Emergency Communication Channel

Projello includes built-in WebRTC voice and video communication channels coordinated through a SignalR signalling hub.

The communication layer enables immediate, one-click contact for critical on-site incidents while keeping routine project communication lightweight and non-disruptive.

Key characteristics include:

* Real-time voice calls
* Real-time video calls
* Temporary communication rooms
* Automatic room removal when empty
* No persistent database storage footprint

This approach aligns with Projello's lightweight, functional-first philosophy.

---

# 📸 Application Screenshots

## Dashboard Workspace

The primary operational dashboard displaying:

* Active projects
* Project health indicators
* Team performance metrics
* High-level operational summaries

---

## Milestone Tracking

Interactive timeline visualisations showing:

* Project milestones
* Progress indicators
* Task completion states
* Due dates and deadlines

---

## Daily Check-in Interface

A simplified 30-second reporting workflow used by site crews to:

* Submit progress updates
* Record site observations
* Upload verification photographs
* Submit status reactions

---

## Client Portal

A restricted reporting environment designed specifically for external clients.

The portal provides transparent project visibility while protecting internal operational information.

---

## Project Creation

Structured form interfaces enabling project managers to:

* Create new projects
* Define project scopes
* Assign project leads
* Link client organisations

---

## User Management

Administrative interfaces used to manage:

* User accounts
* Security permissions
* Team memberships
* Onboarding states
* Access roles

---

# 📂 Project Structure

```plaintext
projello-workspace/
├── Projello.Api/                     # ASP.NET Core 10.0 Web API Service
│
│   ├── Controllers/                  # REST API Response Handlers
│   │   ├── AuthController.cs         # Identity, Registration, JWT Issuance & 2FA
│   │   ├── ClientsController.cs      # Client Records & Blacklist Management
│   │   ├── MilestonesController.cs   # Milestone Definitions & Status Tracking
│   │   ├── ProjectsController.cs     # Projects, Workspaces & Team Assignment
│   │   └── UpdatesController.cs      # Daily Check-ins & Photo Uploads
│
│   ├── Data/                         # Entity Framework Core Data Layer
│   │   └── AppDbContext.cs           # Database Schema Configuration
│
│   ├── DTOs/                         # Data Transfer Objects
│   │   ├── UserRegisterDto.cs
│   │   ├── MilestoneCreateDto.cs
│   │   ├── TaskUpdateDto.cs
│   │   ├── TaskStatusUpdateDto.cs
│   │   ├── UserUpdateDto.cs
│   │   └── ProjectCreateDto.cs
│
│   ├── Hubs/                         # Real-Time Communication Layer
│   │   └── ProjectCallHub.cs         # SignalR WebRTC Signalling Server
│
│   ├── Models/                       # Core Database Entities
│   │   ├── User.cs
│   │   ├── Client.cs
│   │   ├── Project.cs
│   │   ├── Milestone.cs
│   │   ├── Task.cs
│   │   ├── ProjectMember.cs
│   │   ├── ProgressUpdate.cs
│   │   ├── Reaction.cs
│   │   ├── Company.cs
│   │   └── CompanyInvite.cs
│
│   ├── Projello.Api.csproj           # Project Build Configuration
│   ├── appsettings.json              # Local Configuration & Secrets
│   └── Dockerfile                    # Production Container Build
│
└── Projello.Frontend/                # Electron Desktop Client

    ├── src/

    │   ├── assets/                   # Static Assets
    │   │   └── fonts/                # Offline Roboto Font Files

    │   ├── components/               # Reusable UI Components
    │   │   ├── AddButton.tsx
    │   │   ├── AddProjectMemberModal.tsx
    │   │   ├── CallOverlay.tsx
    │   │   ├── ItemCard.tsx
    │   │   ├── ManagementTopNav.tsx
    │   │   ├── ProjectAddModal.tsx
    │   │   ├── ProfileSection.tsx
    │   │   ├── SortButton.tsx
    │   │   ├── FilterButton.tsx
    │   │   └── Navbar.tsx

    │   ├── views/                    # Permission-Based Application Views
    │   │   ├── Dashboard.tsx
    │   │   ├── ClientPortal.tsx
    │   │   ├── DailyCheckIn.tsx
    │   │   └── SplashPage.tsx

    │   ├── config.ts                 # Environment Configuration
    │   ├── App.tsx                   # Application Routing & Permissions
    │   └── index.tsx                 # Application Bootstrap Entry Point

    ├── package.json                  # Node Dependencies & Scripts
    └── webpack.config.js             # Webpack Build Configuration
```
# 🚀 Installation & Setup

## Prerequisites

Before running Projello, ensure the following software is installed:

* .NET 10.0 SDK (for local development and Entity Framework tooling)
* Node.js v18 or newer
* Docker Desktop (or Docker Engine)
* An active Aiven Cloud account with a managed PostgreSQL database instance

---

# 🐳 Backend & Database Setup (Docker + Aiven)

## Step 1: Obtain Your Aiven Connection Details

Log in to your Aiven Console, navigate to your managed PostgreSQL cluster, and retrieve your production connection string.

Example:

```plaintext
Host=YOUR-PROJECT.aivencloud.com;
Port=YOUR-PORT;
Database=ProjelloDb;
Username=avnadmin;
Password=YOUR-SECURE-PASSWORD;
SSL Mode=Require;
```

---

## Step 2: Configure Environment Variables

Navigate to the API project directory:

```bash
cd Projello.Api
```

Open `appsettings.json` and insert your database credentials:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=YOUR-PROJECT.aivencloud.com;Port=YOUR-PORT;Database=ProjelloDb;Username=avnadmin;Password=YOUR-SECURE-PASSWORD;SSL Mode=Require;"
  }
}
```

---

## Step 3: Apply Database Migrations

Use Entity Framework Core to create and update database schemas:

```bash
dotnet ef database update
```

---

## Step 4: Build the Backend Docker Image

Projello includes a multi-stage production Dockerfile to ensure environment consistency across development and deployment targets.

Build the image locally:

```bash
docker build -t projello-api:latest .
```

---

## Step 5: Run the Backend Container

Launch the container and expose the required ports:

```bash
docker run -d \
-p 5000:80 \
--name projello-backend-service \
projello-api:latest
```

The API will now be available locally at:

```plaintext
http://localhost:5000
```

All database transactions will be routed directly to the configured Aiven PostgreSQL instance.

---

# 💻 Desktop Frontend Setup

Navigate to the frontend project directory:

```bash
cd ../Projello.Frontend
```

Install project dependencies:

```bash
npm install
```

---

## Configure API Endpoints

Verify that `src/config.ts` points to the active backend service:

```typescript
export const API_BASE_URL = "http://localhost:5000";
```

---

## Launch the Electron Application

Start the desktop client:

```bash
npm start
```

Electron will launch the Projello desktop application connected to the configured backend environment.

---

# ⚡ Challenges & Solutions

## Challenge 1: Enterprise System Over-Engineering vs On-Site Usability

### The Problem

Construction supervisors and field workers operate in fast-moving environments where time, visibility, and simplicity are critical.

Traditional project management platforms often require users to navigate dense Kanban systems, manage story points, and interact with complex task hierarchies that are poorly suited to on-site work.

### The Solution

Projello introduced the **30-Second Daily Check-in Workflow**.

Instead of navigating multiple administrative layers, field personnel interact with a single, highly readable submission interface that enables them to:

* Submit a brief status update
* Select one of five predefined emoji indicators
* Attach photographic evidence
* Submit progress reports instantly

Cloudinary integration ensures uploaded media is handled efficiently while maintaining a lightweight user experience.

---

## Challenge 2: Desktop Cross-Platform Consistency & Presentation Reliability

### The Problem

The application needed to maintain consistent layouts, responsive performance, and reliable real-time communication across a mixture of:

* Legacy Windows environments
* Modern Windows systems
* macOS devices

Platform-specific rendering differences and environmental conflicts posed significant risks.

### The Solution

The frontend was deployed inside a dedicated Electron shell running React 19 and Webpack.

This architecture:

* Isolates the application environment
* Standardises rendering behaviour
* Reduces platform-specific inconsistencies
* Provides secure hardware-accelerated execution
* Supports low-latency WebRTC communications

The result is a stable and predictable desktop experience across operating systems.

---

## Challenge 3: Multi-Developer Environment Drift & Deployment Consistency

### The Problem

Maintaining identical environments across multiple developer workstations while ensuring smooth deployment to production can lead to:

* Database inconsistencies
* Dependency conflicts
* Deployment failures
* Configuration drift

### The Solution

Team Cepression adopted a fully containerised deployment strategy using Docker and Aiven Cloud Infrastructure.

This approach provides:

* Consistent operating environments
* Reproducible deployments
* Standardised dependency management
* Managed PostgreSQL hosting
* Reduced infrastructure maintenance overhead

By combining Docker with Aiven's managed cloud services, all operational data remains highly available and centrally managed.

---

# 💭 Reflection

Developing Projello reinforced the importance of user-centred, functional-first software design.

During the project's early architectural planning stages, the natural inclination was to incorporate numerous enterprise features, including:

* Full calendar integration
* Deep hierarchical asset management
* Extensive nested task structures
* Additional reporting systems

However, research into construction and field-service workflows demonstrated that operational speed, clarity, and ease of use were more valuable than feature quantity.

The decision to prioritise focused workflows over feature accumulation resulted in a significantly more practical solution.

The adoption of a code-first Entity Framework development process, combined with Docker containerisation, also enabled rapid iteration of database schemas and application architecture as project requirements evolved.

Projello demonstrates that software specifically designed around the operational realities of its industry can outperform generic enterprise solutions by focusing on what users actually need.

---

# 🔮 Future Improvements

## 🔄 Local Offline Synchronisation

Implement a local SQLite caching layer within the Electron application.

This would allow site crews to:

* Continue working without internet connectivity
* Store daily updates locally
* Cache image uploads
* Automatically synchronise data once connectivity returns

---

## 🔔 Real-Time Alerts & Roadblock Notifications

Expand SignalR functionality to provide:

* Instant milestone notifications
* High-priority issue alerts
* Administrative dashboard warnings
* Escalation workflows for critical site problems

Notifications would appear immediately when field personnel report major operational roadblocks.

---

## 🤖 AI-Powered Progress Summarisation

Integrate lightweight Natural Language Processing (NLP) services within the backend infrastructure.

Potential functionality includes:

* Weekly progress summaries
* Executive project reports
* Automated client updates
* Risk and delay identification

Generated summaries could be delivered directly to stakeholders through professionally formatted email reports.

---

# 🪪 Licence

This project is distributed under the terms of the MIT Licence.

For full licensing information, refer to the `LICENSE` file included within the repository.

---

# 👥 Authors

Developed by **Team Cepression** for the academic assessment requirements of **Interactive Development 300** at the Open Window Institute.

### Team Members

* Angie van Rooyen
* Xander Poalses
* David Golding
* Francois le Roux
* William Basson

---

**Project Developed for Academic Assessment**
Open Window Institute
Interactive Development 300
2026
