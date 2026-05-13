import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./single-project-view.css";

const API_BASE_URL = "http://localhost:5049/api";

type Project = {
  projectID: number;
  name: string;
  description: string;
  clientID: number;
  clientName: string;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  // Suggested backend change: add project photo URLs here so the gallery can render real data.
  photoTiles?: string[];
};

type PhotoSectionProps = {
  project: Project;
};

function RecentSitePhotosSection({ project }: PhotoSectionProps) {
  const photoTiles = project.photoTiles ?? [];

  return (
    <section className="single-project-view__photo-section" aria-label="Recent site photos">
      <div className="single-project-view__panel-header-row">
        <h3 className="single-project-view__panel-title single-project-view__panel-title--section">Recent Site Photos</h3>
        <button type="button" className="single-project-view__view-all-button">
          View All <span aria-hidden="true">›</span>
        </button>
      </div>

      <div className="single-project-view__photo-grid">
        <button type="button" className="single-project-view__photo-tile single-project-view__photo-tile--add">
          <span className="single-project-view__photo-plus" aria-hidden="true">+</span>
          <span className="single-project-view__photo-label">Add Photo</span>
        </button>

        {/* When the API starts returning `photoTiles`, these placeholders will render real project images. */}
        {photoTiles.length > 0 ? (
          photoTiles.slice(0, 3).map((tile, index) => (
            <div
              key={`${tile}-${index}`}
              className="single-project-view__photo-tile single-project-view__photo-tile--placeholder"
              aria-hidden="true"
              style={{ backgroundImage: `url(${tile})`, backgroundSize: "cover", backgroundPosition: "center" }}
            />
          ))
        ) : (
          <>
            <div className="single-project-view__photo-tile single-project-view__photo-tile--placeholder" aria-hidden="true" />
            <div className="single-project-view__photo-tile single-project-view__photo-tile--placeholder" aria-hidden="true" />
            <div className="single-project-view__photo-tile single-project-view__photo-tile--placeholder" aria-hidden="true" />
          </>
        )}
      </div>
    </section>
  );
}

export default function SingleProjectViewPage() {
  const navigate = useNavigate(); 
  const location = useLocation(); 
  const { projectId, id } = useParams<{ projectId?: string; id?: string }>(); //
  const resolvedProjectId = projectId ?? id;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { 
    const fetchProject = async () => {
      if (!resolvedProjectId) {
        setError("Project ID is missing");
        setLoading(false);
        return;
      } 

      const id = parseInt(resolvedProjectId, 10);
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

        // This assumes the backend returns the DTO shape used below, including any future photoTiles data.
        const data: Project = await res.json();
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
  }, [resolvedProjectId]);

  if (loading) return <div className="single-project-view__state single-project-view__state--loading">Loading project...</div>;
  if (error) return <div className="single-project-view__state single-project-view__state--error">Error: {error}</div>;
  if (!project) return <div className="single-project-view__state single-project-view__state--error">Project not found.</div>;

  return (
    <div className="single-project-view">
      <div className="single-project-view__header">
        <div className="single-project-view__header-top-row">
          <div className="single-project-view__breadcrumb-row">
            <button
              onClick={() => {
                const from = (location.state as { from?: string } | null)?.from;
                navigate(from || "/dashboard");
              }}
              className="single-project-view__back-button"
              aria-label="Back"
            >
              ←
            </button>
            <h1 className="single-project-view__project-name">{project.name}</h1>
            <span className="single-project-view__separator">/</span>
            <span className="single-project-view__client-name">{project.clientName}</span>
            <span className="single-project-view__completion-pill">0% Complete</span>
          </div>

          <button type="button" className="single-project-view__call-button">
            <span aria-hidden="true">☎</span>
            <span>Start Call</span>
          </button>
        </div>

        <div className="single-project-view__tabs">
          <button className="single-project-view__tab single-project-view__tab--active">Overview</button>
          <button className="single-project-view__tab">Discussion 0</button>
          <button className="single-project-view__tab">Gallery 0</button>
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

      <RecentSitePhotosSection project={project} />
    </div>
  );
}