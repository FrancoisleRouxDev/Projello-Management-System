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

type ProjectModalStep = "menu" | "edit-payments";

interface ProjectActionModalProps {
  project: Project | null;
  onClose: () => void;
  onRefresh: () => void | Promise<void>;
  allProjects: Project[];
}

function ProjectActionModal({ project, onClose, onRefresh, allProjects }: ProjectActionModalProps) {
  const [step, setStep] = useState<ProjectModalStep>("menu");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [editTotalPaid, setEditTotalPaid] = useState(0);
  const [editOutstanding, setEditOutstanding] = useState(0);
  const [editStatus, setEditStatus] = useState("Planning");

  const parseAmount = (value: any): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      return parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
    }
    return 0;
  };

  useEffect(() => {
    if (project && step === "edit-payments") {
      setEditTotalPaid(parseAmount(project.totalPaid));
      setEditOutstanding(parseAmount(project.outstanding));
      setEditStatus(project.status || "Planning");
    }
  }, [step, project]);

  const handleSaveEdit = async () => {
    if (!project) return;

    setBusy(true);
    try {
      const token = localStorage.getItem("token");

    
      const res = await fetch(`${API_BASE_URL}/api/projects/${project.projectID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          Name: project.name,
          Description: project.description,
          ClientID: project.clientID,
          StartDate: project.startDate,
          DueDate: project.dueDate,
          TotalPaid: editTotalPaid,
          Outstanding: editOutstanding,
          Status: editStatus,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`Failed to update project (${res.status}): ${errorText || res.statusText}`);
      }

      // Update status via the dedicated endpoint (this is the correct way for status)
      const statusRes = await fetch(`${API_BASE_URL}/api/projects/${project.projectID}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: editStatus,  
        }),
      });

      if (!statusRes.ok) {
        const errorText = await statusRes.text().catch(() => "");
        throw new Error(`Failed to update status (${statusRes.status}): ${errorText || statusRes.statusText}`);
      }

      await onRefresh();
      setFeedback(`Project updated successfully.`);

    } catch (err) {
      console.error(err);
      setFeedback(err instanceof Error ? err.message : "Failed to update project.");
    } finally {
      setBusy(false);
    }
  };

  if (!project) return null;

  if (feedback) {
    return (
      <div className="action-modal-overlay" onClick={onClose}>
        <div className="action-modal" onClick={e => e.stopPropagation()}>
          <div className="action-modal__header">
            <h3 className="action-modal__title">Done</h3>
            <button className="action-modal__close" onClick={onClose} aria-label="Close modal">×</button>
          </div>
          <div className="action-modal__body">
            <p className="action-modal__feedback">{feedback}</p>
          </div>
          <div className="action-modal__actions">
            <button className="action-modal__btn action-modal__btn--primary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "menu") {
    return (
      <div className="action-modal-overlay" onClick={onClose}>
        <div className="action-modal" onClick={e => e.stopPropagation()}>
          <div className="action-modal__header">
            <h3 className="action-modal__title">{project.name}</h3>
            <button className="action-modal__close" onClick={onClose} aria-label="Close modal">×</button>
          </div>
          <div className="action-modal__body">
            <p className="action-modal__sub">Choose an action</p>
          </div>
          <div className="action-modal__actions">
            <button
              className="action-modal__btn action-modal__btn--secondary"
              onClick={() => setStep("edit-payments")}
            >
              Edit Payments & Status
            </button>
            <button className="action-modal__btn action-modal__btn--ghost" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "edit-payments") {
    return (
      <div className="action-modal-overlay" onClick={onClose}>
        <div className="action-modal" onClick={e => e.stopPropagation()}>
          <div className="action-modal__header">
            <h3 className="action-modal__title">Edit Payments & Status</h3>
            <button className="action-modal__close" onClick={onClose} aria-label="Close modal">×</button>
          </div>
          <div className="action-modal__body">
            <div style={{ marginBottom: "12px" }}>
              <label>Total Paid</label>
              <input
                type="number"
                className="action-modal__input"
                value={editTotalPaid}
                onChange={(e) => setEditTotalPaid(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label>Outstanding</label>
              <input
                type="number"
                className="action-modal__input"
                value={editOutstanding}
                onChange={(e) => setEditOutstanding(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label>Status</label>
              <select
                className="action-modal__input"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
              >
                <option value="Planning">Planning</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="action-modal__actions">
            <button
              className="action-modal__btn action-modal__btn--primary"
              onClick={handleSaveEdit}
              disabled={busy}
            >
              {busy ? "Saving..." : "Save Changes"}
            </button>
            <button className="action-modal__btn action-modal__btn--ghost" onClick={() => setStep("menu")}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function ManagementPage() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ManagementView>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<{ clientID: number; name: string }[]>([]);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);

  let isMounted = true; // To prevent state updates on unmounted component

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "—";
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`Status ${response.status}: ${response.statusText}${errorText ? ` — ${errorText}` : ""}`);
      }

      const data: any[] = await response.json();
      const normalized = (data ?? []).map((p: any) => ({
        projectID: p.projectID ?? p.ProjectID ?? p.projectId ?? p.Id ?? p.id,
        name: p.name ?? p.Name ?? "",
        description: p.description ?? p.Description ?? "",
        clientID: p.clientID ?? p.ClientID ?? p.clientId,
        clientName: p.clientName ?? p.ClientName ?? p.client_name ?? "",
        status: p.status ?? p.Status ?? "Planning",
        startDate: p.startDate ?? p.StartDate ?? null,
        dueDate: p.dueDate ?? p.DueDate ?? null,
        createdAt: p.createdAt ?? p.CreatedAt ?? "",
        totalPaid: p.totalPaid ?? p.TotalPaid ?? p.total_paid ?? null,
        outstanding: p.outstanding ?? p.Outstanding ?? p.outstanding_amount ?? null,
      }));
      console.log("All Projects Fetched (normalized):", normalized);
      setProjects(normalized);
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
      const res = await fetch(`${API_BASE_URL}/api/clients`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || res.statusText || "Failed to load clients");
      }
      const data = await res.json();
      const mapped = (data ?? []).map((c: any) => ({
        clientID: c.clientID ?? c.ClientID ?? c.ClientId,
        name: c.name ?? c.Name ?? ""
      }));
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
      // Use proper ZAR currency formatting (same style as Clients page)
      totalPaid: project.totalPaid != null ? formatCurrency(Number(project.totalPaid)) : "—",
      outstanding: project.outstanding != null ? formatCurrency(Number(project.outstanding)) : "—",
      projects: "—",
      activeProjects: project.status === "Active" ? "1" : "0",
      status: project.status,
      statusTone: project.status === "Active" ? "success" : "neutral",
    };
  });

  const handleRowClick = (row: ManagementClientRow) => {
    navigate(`/single-view/${row.clientId}`);
  };

  const handleRowAction = (row: ManagementClientRow) => {
    // Same pattern as ClientsPage: onRowAction opens the edit modal (payments/status)
    // while onRowClick is reserved for navigation/detail view.
    const foundProject = projects.find(p => p.projectID.toString() === row.clientId);
    if (foundProject) {
      setSelectedProject(foundProject);
      setShowProjectModal(true);
    }
  };

  const closeProjectModal = () => {
    setShowProjectModal(false);
    setSelectedProject(null);
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
                onRowAction={handleRowAction}
                onRowClick={handleRowClick}
                hideProjectsColumn={true}
              />
            )}
          </>
        )}
        {activeView === "clients" && <ClientsPage />}
        {activeView === "workers" && <WorkersPage />}
      </div>

      {showProjectModal && selectedProject && (
        <ProjectActionModal
          project={selectedProject}
          onClose={closeProjectModal}
          onRefresh={fetchProjects}
          allProjects={projects}
        />
      )}
    </div>
  );
}