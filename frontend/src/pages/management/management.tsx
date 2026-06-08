import React, { useEffect, useState } from "react";
// import {Link} from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "./management.css";
import ManagementClientTable, { ManagementClientRow } from "../../components/ManagementClientTable";
import ManagementTopNav from '../../components/ManagementTopNav';
import ClientsPage from "./Clients";
import WorkersPage from "./Workers";
import { API_BASE_URL } from "../../config";

interface Project {
  projectID: number;
  name: string;
  description: string;
  clientID: number;
  clientName: string;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  CreatedAt: string;
}

type ManagementView = "projects" | "clients" | "workers";

export default function ManagementPage() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ManagementView>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<{ clientID: number; name: string }[]>([]);

  let isMounted = true; // To prevent state updates on unmounted component
   const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/api/projects`, {
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

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/clients`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || res.statusText || "Failed to load clients");
      }
      const data = await res.json();
      const mapped = (data ?? []).map((c: any) => ({ clientID: c.clientID ?? c.ClientID ?? c.ClientId, name: c.name ?? c.Name ?? "" }));
      setClients(mapped);
    } catch (err: any) {
      console.warn("Could not load clients for selector:", err);
      setClients([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      if (!mounted) return;
      await Promise.all([fetchProjects(), fetchClients()]);
    })();
    return () => { mounted = false; };
  }, []);

  // Map Project data to ManagementClientRow for table display
  // Filter out completed projects from management view
  const activeProjects = projects.filter((project) => project.status !== "Completed");
  
  const tableRows: ManagementClientRow[] = activeProjects.map((project) => {
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
      <ManagementTopNav
        tabs={[
          { id: "projects", label: "Projects" },
          { id: "clients", label: "Clients" },
          { id: "workers", label: "Workers" },
        ]}
        activeTab={activeView}
        onTabChange={(id) => setActiveView(id as ManagementView)}
      />
      <div className="management-page__content">
        {activeView === "projects" && (
          <>
            <div className="management-page__heading-box">
              <h2>Project Management</h2>
            </div>
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
        {activeView === "clients" && <ClientsPage />}
        {activeView === "workers" && <WorkersPage />}
      </div>
    </div>
  );
}