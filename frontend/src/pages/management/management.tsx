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
  const [clients, setClients] = useState<{ clientID: number; name: string }[]>([]); // For client dropdown in project modal

  let isMounted = true; // To prevent state updates on unmounted component
   const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/projects`, { method: "GET", headers });
      if (!response.ok) throw new Error(`Status ${response.status}: ${response.statusText}`);
      const data: Project[] = await response.json();
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
    navigate(`/single-view/${row.clientId}`, { state: { from: "/management" } });
  };

  const handleProjectSubmit = async (data: any) => {
    try {
      const token = localStorage.getItem("token");
      const payload = {
        Name: data.name,
        ClientID: Number(data.clientID),
        Description: data.description || "",
        StartDate: data.startDate || null,
        DueDate: data.dueDate || null,
      };

      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      const created = text ? JSON.parse(text) : null;

      if (!res.ok) {
        if (res.status === 403) {
          console.error("Create forbidden: you need admin privileges.");
        } else {
          console.error("Failed to create project:", created ?? res.statusText);
        }
        return;
      }

      setProjectModalOpen(false);
      await fetchProjects();
      console.log("Project created:", created);
    } catch (err) {
      console.error("Error creating project:", err);
    }
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
     
<ReusableEntryModal<{ name: string; clientID: number; description: string; startDate: string; dueDate: string }>
  open={projectModalOpen}
  title="Add New Project"
  submitLabel="Create Project"
  onClose={() => setProjectModalOpen(false)}
  onSubmit={handleProjectSubmit}
  initialValues={{ name: "", clientID: clients.length ? clients[0].clientID : 0, description: "", startDate: "", dueDate: "" }}
  validate={(values) => {
    if (!values.name.trim()) return "Project name is required";
    if (!values.clientID) return "Client is required";
    if (values.name.length > 200) return "Project name cannot exceed 200 characters";
    return null;
  }}
  renderFields={(values, setValue, error) => (
    <div>
      {error && <div className="reusable-entity-modal__error">{error}</div>}

      <div className="reusable-entity-modal__form-group">
        <label className="reusable-entity-modal__label reusable-entity-modal__label--required">Project Name</label>
        <input className="reusable-entity-modal__input" type="text" value={values.name} onChange={(e) => setValue("name", e.target.value)} placeholder="Enter project name" />
      </div>

      <div className="reusable-entity-modal__form-group">
        <label className="reusable-entity-modal__label reusable-entity-modal__label--required">Client</label>
        {/* NEW: added title attr for accessibility */}
        <select className="reusable-entity-modal__select" title="Select a client" value={values.clientID} onChange={(e) => setValue("clientID", Number(e.target.value))}>
          <option value={0} disabled>Select a client</option>
          {clients.map((c) => (
            <option key={c.clientID} value={c.clientID}>{c.name || `Client ${c.clientID}`}</option>
          ))}
        </select>
      </div>

      <div className="reusable-entity-modal__form-group">
        <label className="reusable-entity-modal__label">Description</label>
        <textarea className="reusable-entity-modal__textarea" value={values.description} onChange={(e) => setValue("description", e.target.value)} placeholder="Enter project description" rows={4} />
      </div>

      <div className="reusable-entity-modal__form-group">
        <label className="reusable-entity-modal__label">Start Date</label>
        {/* NEW: added title attr for accessibility */}
        <input className="reusable-entity-modal__input" type="date" title="Start date" value={values.startDate} onChange={(e) => setValue("startDate", e.target.value)} />
      </div>

      <div className="reusable-entity-modal__form-group">
        <label className="reusable-entity-modal__label">Due Date</label>
        {/* NEW: added title attr for accessibility */}
        <input className="reusable-entity-modal__input" type="date" title="Due date" value={values.dueDate} onChange={(e) => setValue("dueDate", e.target.value)} />
      </div>
    </div>
  )}
/>

    </div>
  );
}
