import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./single-project-view.css";

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

export default function SingleProjectViewPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        setError("Project ID is missing");
        setLoading(false);
        return;
      }

      const id = parseInt(projectId, 10);
      if (isNaN(id)) {
        setError("Invalid Project ID");
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
          method: "GET",
          headers,
        });

        if (!res.ok) {
          throw new Error(`Status ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        console.log("Fetched Project:", data);
        setProject(data);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (loading) return <div className="loading">Loading project...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!project) return <div className="error">Project not found.</div>;

  return (
    <div className="single-project-view">
      <div className="single-project-view__header">
        <div className="single-project-view__breadcrumb-row">
          <button 
            onClick={() => navigate("/management")} 
            className="single-project-view__back-button"
          >
            ←
          </button>
          <h1 className="single-project-view__project-name">{project.name}</h1>
          <span className="single-project-view__separator">/</span>
          <span className="single-project-view__client-name">{project.clientName}</span>
          <span className="single-project-view__completion-pill">{project.status}</span>
        </div>
        
        <div className="single-project-view__tabs">
          <button className="single-project-view__tab single-project-view__tab--active">Overview</button>
          <button className="single-project-view__tab">Details</button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="single-project-view__stats">
        <div className="single-project-view__stat-card">
          <span className="single-project-view__stat-label">Project ID</span>
          <span className="single-project-view__stat-value">{project.projectID}</span>
        </div>
        <div className="single-project-view__stat-card">
          <span className="single-project-view__stat-label">Client</span>
          <span className="single-project-view__stat-value">{project.clientName}</span>
        </div>
        <div className="single-project-view__stat-card">
          <span className="single-project-view__stat-label">Status</span>
          <span className="single-project-view__stat-value">{project.status}</span>
        </div>
        <div className="single-project-view__stat-card">
          <span className="single-project-view__stat-label">Start Date</span>
          <span className="single-project-view__stat-value">
            {new Date(project.startDate || "").toLocaleDateString()}
          </span>
        </div>
        <div className="single-project-view__stat-card">
          <span className="single-project-view__stat-label">Due Date</span>
          <span className="single-project-view__stat-value">
            {new Date(project.dueDate || "").toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="single-project-view__main-grid">
        <div className="single-project-view__panel">
          <h3 className="single-project-view__panel-title">Description</h3>
          <p className="single-project-view__project-description">
            {project.description || "No description provided."}
          </p>
        </div>

        <div className="single-project-view__panel">
          <h3 className="single-project-view__panel-title">Milestones</h3>
          <p className="single-project-view__project-description">
            Milestone data loading...
          </p>
        </div>
      </div>
    </div>
  );
}