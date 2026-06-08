# Projello

### Lightweight Project Management System Built for the Construction Industry

---

## 📄 Description

**Projello** is a tailored, functional-first project management system designed specifically to bridge the gap between heavy, bloated enterprise project management software and the fast-paced, high-pressure execution environment of the construction and interactive development industries.

Built with a signature professional sage green visual aesthetic, Projello eliminates feature bloat in favor of streamlined, targeted workflows—such as a 30-second daily worker check-in system, hierarchical milestone tracking, and transparent client access layers.

Developed by team **Cepression** for the **Interactive Development 300** module at the **Open Window Institute**, Projello empowers project managers, site crews, and external clients to align perfectly on structural deliverables without drowning in admin overhead.

---

## 🎯 Project Overview

In industries like construction, generic agile project trackers (e.g., Jira, Trello) often fail because they expect workers in the field to manage complex card configurations, story points, and verbose text blocks. Field engineers and contractors require immediate, low-friction entry pathways to signal roadblock states or record on-site milestone achievements.

Projello operates on a **Functional-First** philosophy. It introduces a hierarchical project data ecosystem:

```text
Client → Project → Milestone → Task
```

This structure is backed by multi-tiered permission rules that dynamically secure scope visibility from executive-level managers down to site crews and external stakeholders.

---

## 🛠️ Tech Stack & Architecture

Projello is constructed using a robust, decoupled client-server architecture designed to provide scalability, low-latency execution, and direct desktop lifecycle management.

### Frontend Architecture

* **UI Framework:** React 19 (TypeScript)
* **Desktop Runtime:** Electron
* **Build Tooling:** Webpack, Electron Forge
* **Styling:** Modular CSS using a custom Sage Green palette

```css
#4A6B52
#EAF0EB
#2C3E31
```

### Backend Architecture

* **Framework:** ASP.NET Core 10 Web API
* **Language:** C# 14
* **ORM:** Entity Framework Core 10
* **Database:** PostgreSQL
* **Authentication:** ASP.NET Identity, JWT, BCrypt, Otp.NET
* **File Storage:** Cloudinary

---

## ⚙️ Data Flow Example

### 1. React → API Communication

When a project manager assigns a worker through `AddProjectMemberModal.tsx`:

1. The frontend retrieves workers from:

```http
GET /api/users/workers
```

2. The user selects a worker and submits:

```json
{
  "selectedUserId": 5,
  "assignedAs": "Worker",
  "projectId": 12
}
```

3. The JWT token is attached:

```http
Authorization: Bearer <token>
```

---

### 2. ASP.NET Controller Processing

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
            return NotFound("Project not found.");

        var newMember = new ProjectMember
        {
            ProjectId = id,
            UserId = dto.UserId,
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

### 3. Database Synchronization

* Entity Framework generates SQL automatically.
* PostgreSQL stores the new record.
* The API returns `200 OK`.
* React updates local state and re-renders the interface.

---

## ✨ Key Features

### 30-Second Daily Check-ins

Allows workers to:

* Update milestone progress
* Add quick notes
* Report blockers

Without navigating through multiple screens.

### Role-Based Access Control (RBAC)

Roles include:

* Admin
* Project Manager
* Worker
* Client

Clients can only access their own projects.

### Milestone & Task Tracking

Interactive timelines allow users to:

* View project progress
* Monitor milestone completion
* Track assigned tasks

### Secure Authentication

Features include:

* JWT authentication
* Password hashing
* Two-factor authentication (2FA)

### Photo Verification Uploads

Workers can upload proof-of-completion photos using Cloudinary integration.

---

## 📸 Application Screenshots

### Dashboard Workspace

![Dashboard](Screenshot%202026-05-27%20094105.png)

### Milestone Tracking

![Milestones](Screenshot%202026-05-27%20094116.png)

### Daily Check-in Interface

![Daily Check-In](Screenshot%202026-05-27%20094126.png)

### Client Portal

![Client Portal](Screenshot%202026-05-27%20094136.png)

### Project Creation

![Project Creation](Screenshot%202026-05-27%20094144.png)

### User Management

![User Management](Screenshot%202026-05-27%20094155.png)

---

## 📂 Project Structure

```text
projello-workspace/
│
├── Projello.Api/
│   ├── Controllers/
│   │   ├── AuthController.cs
│   │   ├── ClientsController.cs
│   │   └── ProjectsController.cs
│   │
│   ├── Data/
│   │   └── AppDbContext.cs
│   │
│   ├── DTOs/
│   │   ├── UserRegisterDto.cs
│   │   └── ProjectCreateDto.cs
│   │
│   ├── Models/
│   │   ├── User.cs
│   │   ├── Project.cs
│   │   └── Milestone.cs
│   │
│   ├── Projello.Api.csproj
│   └── appsettings.json
│
└── Projello.Frontend/
    ├── src/
    │   ├── components/
    │   │   ├── AddButton.tsx
    │   │   ├── AddProjectMemberModal.tsx
    │   │   └── Navbar.tsx
    │   │
    │   ├── views/
    │   │   ├── Dashboard.tsx
    │   │   ├── ClientPortal.tsx
    │   │   └── DailyCheckIn.tsx
    │   │
    │   ├── config.ts
    │   ├── App.tsx
    │   └── index.tsx
    │
    ├── package.json
    └── webpack.config.js
```

---

## 🚀 Installation & Setup

### Prerequisites

* .NET 10 SDK
* Node.js v18+
* PostgreSQL

---

### Backend Setup

```bash
cd Projello.Api
```

Update:

```json
"ConnectionStrings": {
  "DefaultConnection":
  "Host=localhost;Database=ProjelloDb;Username=postgres;Password=YOUR_PASSWORD"
}
```

Run migrations:

```bash
dotnet ef database update
```

Start the API:

```bash
dotnet run
```

Default host:

```text
http://localhost:5000
```

---

### Frontend Setup

```bash
cd ../Projello.Frontend
npm install
```

Verify:

```typescript
export const API_BASE_URL = "http://localhost:5000";
```

Start Electron:

```bash
npm start
```

---

## ☁️ Ubuntu Deployment

### Install .NET SDK

```bash
wget https://packages.microsoft.com/config/ubuntu/22.04/packages-microsoft-prod.deb

sudo dpkg -i packages-microsoft-prod.deb

sudo apt-get update

sudo apt-get install -y dotnet-sdk-10.0
```

### Configure Nginx

```nginx
server {
    listen 80;
    server_name api.projello-engine.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;

        proxy_cache_bypass $http_upgrade;

        proxy_set_header X-Forwarded-For
            $proxy_add_x_forwarded_for;

        proxy_set_header X-Forwarded-Proto
            $scheme;
    }
}
```

Enable:

```bash
sudo ln -s \
/etc/nginx/sites-available/projello \
/etc/nginx/sites-enabled/

sudo nginx -t

sudo systemctl restart nginx
```

---

### Systemd Service

```ini
[Unit]
Description=Projello API

[Service]
WorkingDirectory=/var/www/projello-api
ExecStart=/usr/bin/dotnet Projello.Api.dll

Restart=always
RestartSec=10

Environment=ASPNETCORE_ENVIRONMENT=Production

[Install]
WantedBy=multi-user.target
```

Enable:

```bash
sudo systemctl enable --now projello-api.service
```

---

## 🗄️ Database Relationships

```text
CLIENT
 └── PROJECT
      └── MILESTONE
            └── TASK

PROJECT
 └── PROJECT_MEMBER
       └── USER
```

### Relationships

| Relationship         | Type |
| -------------------- | ---- |
| Client → Project     | 1:M  |
| Project → Milestone  | 1:M  |
| Milestone → Task     | 1:M  |
| User → ProjectMember | 1:M  |

---

## ⚡ Challenges & Solutions

### Challenge 1: Enterprise Software Complexity

**Problem:** Construction workers do not have time to manage complex project management systems.

**Solution:** A lightweight 30-second check-in system focused on speed and usability.

---

### Challenge 2: Cross-Platform Deployment

**Problem:** Delivering a consistent experience across Windows and macOS.

**Solution:** React combined with Electron to provide a unified desktop environment.

---

## 💭 Reflection

Developing Projello reinforced the importance of user-centred design over feature accumulation.

Early iterations considered:

* Calendar integrations
* Complex asset trees
* Deep sub-task systems

User research showed that workers valued:

* Speed
* Visibility
* Simplicity

As a result, Projello evolved into a focused platform tailored specifically to construction project workflows.

---

## 🔮 Future Improvements

### Offline Support

Implement SQLite caching to allow workers to submit updates without internet connectivity.

### Real-Time Notifications

Use SignalR to push urgent project updates instantly.

### AI Progress Summaries

Automatically generate executive-level weekly reports from check-in data using NLP.

---

## 🪪 License

Distributed under the MIT License.

See the `LICENSE` file for more information.

---

## 👥 Authors

Developed by **Team Cepression** for **Interactive Development 300**:

* Angie van Rooyen
* Xander Poalses
* David Golding
* Francois le Roux
* William Basson

**Open Window Institute — 2026**
