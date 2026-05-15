import React, { useEffect, useState } from "react";
import {Link} from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "./management.css";
import ManagementClientTable, { ManagementClientRow } from "../../components/ManagementClientTable";
import ManagementTopNav from "../../components/ManagementTopNav";
import ClientsPage from "./Clients";
import WorkersPage from "./Workers";
import { AddButton } from "../../components/AddButton";
import { ReusableEntryModal } from "../../components/ReuseableEntityModal";
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
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  let isMounted = true; // To prevent state updates on unmounted component

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
      if (isMounted) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  };

  fetchProjects();
  return () => { isMounted = false; }; 
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
    navigate(`/single-view/${row.clientId}`, { state: { from: "/management" } });
  };

  const handleProjectSubmit = (data: any) => {
    console.log("New project data:", data);
    // TODO: Submit to API endpoint
    // TODO: Refresh projects list
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
        onTabChange={(tabId) => setActiveView(tabId as ManagementView)}
      />
      <div className="management-page__content">
        {activeView === "projects" && (
          <>
            <div className="management-page__heading-box">
              <h2>Project Management</h2>
              <AddButton label="Project" onClick={() => setProjectModalOpen(true)} />
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
     
<ReusableEntryModal<{ name: string; clientName: string; description: string; dueDate: string }>
  open={projectModalOpen}
  title="Add New Project"
  submitLabel="Create Project"
  onClose={() => setProjectModalOpen(false)}
  onSubmit={handleProjectSubmit}
  initialValues={{ name: "", clientName: "", description: "", dueDate: "" }}
  validate={(values) => {
    if (!values.name.trim()) return "Project name is required";
    if (!values.clientName.trim()) return "Client name is required";
    if (values.name.length > 200) return "Project name cannot exceed 200 characters";
    return null;
  }}
  renderFields={(values, setValue, error) => (
    <div>
      {error && <div className="reusable-entity-modal__error">{error}</div>}
      <div className="reusable-entity-modal__form-group">
        <label className="reusable-entity-modal__label reusable-entity-modal__label--required">
          Project Name
        </label>
        <input
          className="reusable-entity-modal__input"
          type="text"
          value={values.name}
          onChange={(e) => setValue("name", e.target.value)}
          placeholder="Enter project name"
        />
      </div>
      <div className="reusable-entity-modal__form-group">
        <label className="reusable-entity-modal__label reusable-entity-modal__label--required">
          Client Name
        </label>
        <input
          className="reusable-entity-modal__input"
          type="text"
          value={values.clientName}
          onChange={(e) => setValue("clientName", e.target.value)}
          placeholder="Enter client name"
        />
      </div>
      <div className="reusable-entity-modal__form-group">
        <label className="reusable-entity-modal__label">Description</label>
        <textarea
          className="reusable-entity-modal__textarea"
          value={values.description}
          onChange={(e) => setValue("description", e.target.value)}
          placeholder="Enter project description"
          rows={4}
        />
      </div>
      <div className="reusable-entity-modal__form-group">
        <label className="reusable-entity-modal__label" htmlFor="project-due-date">
          Due Date
        </label>
        <input
          id="project-due-date"
          type="date"
          className="reusable-entity-modal__input"
          value={values.dueDate}
          onChange={(e) => setValue("dueDate", e.target.value)}
        />
      </div>
    </div>
  )}
/>

    </div>
  );
}
