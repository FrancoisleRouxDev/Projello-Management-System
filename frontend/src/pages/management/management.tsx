import React, { useEffect, useState } from "react";
// import {Link} from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "./management.css";
import ManagementClientTable, { ManagementClientRow } from "../../components/ManagementClientTable";
import ManagementTopNav from "./ManagementTopNav";
// import ClientsPage from "./Clients";
import WorkersPage from "./Workers";

/*
 * MANAGEMENT PAGE STRUCTURE
 * ========================
 * 
 * WHAT'S BEEN ADDED:
 * - ManagementTopNav component: A tabbed navigation bar that allows admins to switch between:
 *   • Projects: Displays project data in a ManagementClientTable
 *   • Clients: CURRENTLY DISABLED (see note below)
 *   • Workers: Displays worker data using WorkersPage
 * 
 * HOW IT WORKS:
 * - The page maintains state for activeView ("projects" | "clients" | "workers")
 * - When activeView changes, the corresponding content is rendered below the nav
 * - Projects view: Fetches project data from /api/projects and displays in a table
 * - Clients view: Commented out - see question below
 * - Workers view: Renders the WorkersPage component which fetches its own data
 * 
 * NOTE ON CLIENTS:
 * TODO: Should we keep the entire Clients.tsx page as a full subpage component,
 * or should we refactor it to display its table content directly in the management page
 * similar to how Projects works? Currently Clients.tsx is disabled.
 * If keeping it: uncomment the import and render line.
 * If removing it: delete Clients.tsx and the Clients tab from ManagementTopNav.
 */

const API_BASE_URL = "http://localhost:5049/api";

interface Project {
  projectID: number;
  name: string;
  description: string;
  clientID: number;
  clientName: string;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
}

type ManagementView = "projects" | "clients" | "workers";

export default function ManagementPage() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ManagementView>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/projects`, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          throw new Error(`Status ${response.status}: ${response.statusText}`);
        }

        const data: Project[] = await response.json();
        console.log("All Projects Fetched:", data); // <--- CHECK THIS IN CONSOLE
        setProjects(data);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Map Project data to ManagementClientRow for table display
  const tableRows: ManagementClientRow[] = projects.map((project) => {
    const clientInitials = project.clientName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return {
      clientId: project.projectID.toString(),
      initials: clientInitials,
      name: project.name,
      company: project.clientName,
      totalPaid: "—",
      outstanding: "—",
      projects: "1",
      activeProjects: project.status === "Active" ? "1" : "0",
      status: project.status,
      statusTone: project.status === "Active" ? "success" : "neutral",
    };
  });

  const handleRowClick = (row: ManagementClientRow) => {
    // Navigate to single project view using the project ID
    navigate(`/single-view/${row.clientId}`);
  };

  return (
    <div className="management-page">
      <ManagementTopNav activeView={activeView} onViewChange={setActiveView} />
      <div className="management-page__content">
        {activeView === "projects" && (
          <>
            <h2>Project Management</h2>
            {loading && <div className="loading">Loading projects...</div>}
            {error && <div className="error">Error: {error}</div>}
            {!loading && !error && projects.length === 0 && (
              <p>No projects found.</p>
            )}
            {!loading && !error && projects.length > 0 && (
              <ManagementClientTable
                rows={tableRows}
                onRowClick={handleRowClick}
              />
            )}
          </>
        )}
        {/* {activeView === "clients" && <ClientsPage />} */}
        {activeView === "workers" && <WorkersPage />}
      </div>
    </div>
  );
}
