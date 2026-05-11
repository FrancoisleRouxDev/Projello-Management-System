// frontend/src/pages/single-view/single-project-view.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./single-project-view.css";
import CallOverlay from "../../components/CallOverlay";
import { useProjectMember } from "../../features/realtime/hooks/useProjectMember";
import { API_BASE_URL } from "../../config";

type ProjectReadDto = {
  projectID: number;
  name: string;
  description: string;
  clientID: number;
  clientName: string;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  photoTiles?: string[];
};

function RecentSitePhotosSection({ project }: { project: ProjectReadDto }) {
  const photoTiles = project.photoTiles ?? [];

  return (
    <section className="single-project-view__photo-section">
      <div className="single-project-view__panel-header-row">
        <h3 className="single-project-view__panel-title">Recent Site Photos</h3>
        <button type="button" className="single-project-view__view-all-button">
          View All →
        </button>
      </div>

      <div className="single-project-view__photo-grid">
        <button type="button" className="single-project-view__photo-tile single-project-view__photo-tile--add">
          <span className="single-project-view__photo-plus">+</span>
          <span className="single-project-view__photo-label">Add Photo</span>
        </button>

        {photoTiles.length > 0 ? (
          photoTiles.slice(0, 3).map((tile, index) => (
            <div
              key={index}
              className="single-project-view__photo-tile"
              style={{ backgroundImage: `url(${tile})`, backgroundSize: "cover", backgroundPosition: "center" }}
            />
          ))
        ) : (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="single-project-view__photo-tile single-project-view__photo-tile--placeholder" />
          ))
        )}
      </div>
    </section>
  );
}

export default function SingleProjectViewPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<ProjectReadDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCallOverlay, setShowCallOverlay] = useState(false);

  // Correct logic from old version
  const { members: teamMembers, loading: membersLoading } = useProjectMember(projectId || "");

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

        const res = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
          method: "GET",
          headers,
        });

        if (!res.ok) {
          throw new Error(`Status ${res.status}: ${res.statusText}`);
        }

        const data: ProjectReadDto = await res.json();
        setProject(data);
      } catch (err) {
        console.error("Failed to fetch project:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const handleStartVoiceCall = () => {
    setShowCallOverlay(true);
  };

  const handleCloseCall = () => {
    setShowCallOverlay(false);
  };

  if (loading) {
    return <div className="single-project-view__state single-project-view__state--loading">Loading project...</div>;
  }

  if (error || !project) {
    return (
      <div className="single-project-view__state single-project-view__state--error">
        {error || "Project not found."}
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="single-project-view">
      {/* Nice Header with Call Button on the far right */}
      <div className="single-project-view__header">
        <div className="single-project-view__header-top-row">
          <div className="single-project-view__breadcrumb-row">
            <button 
              onClick={() => navigate(-1)} 
              className="single-project-view__back-button"
            >
              ←
            </button>
            <h1 className="single-project-view__project-name">{project.name}</h1>
            <span className="single-project-view__separator">/</span>
            <span className="single-project-view__client-name">{project.clientName}</span>
          </div>

          {/* Call Button on the far right */}
          <button 
            type="button" 
            className="single-project-view__call-button"
            onClick={handleStartVoiceCall}
          >
            <span aria-hidden="true">☎</span>
            <span>Start Call</span>
          </button>
        </div>

        <div className="single-project-view__tabs">
          <button className="single-project-view__tab single-project-view__tab--active">Overview</button>
          <button className="single-project-view__tab">Discussion</button>
          <button className="single-project-view__tab">Gallery</button>
        </div>
      </div>

      {/* Stats */}
      <div className="single-project-view__stats">
        <div className="single-project-view__stat-card">
          <span className="single-project-view__stat-label">Project ID</span>
          <span className="single-project-view__stat-value">{project.projectID}</span>
        </div>
        <div className="single-project-view__stat-card">
          <span className="single-project-view__stat-label">Status</span>
          <span className="single-project-view__stat-value">{project.status}</span>
        </div>
        <div className="single-project-view__stat-card">
          <span className="single-project-view__stat-label">Start Date</span>
          <span className="single-project-view__stat-value">
            {project.startDate ? new Date(project.startDate).toLocaleDateString() : "Not set"}
          </span>
        </div>
        <div className="single-project-view__stat-card">
          <span className="single-project-view__stat-label">Due Date</span>
          <span className="single-project-view__stat-value">
            {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "Not set"}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="single-project-view__main-grid">
        <div className="single-project-view__panel">
          <h3 className="single-project-view__panel-title">Description</h3>
          <p className="single-project-view__project-description">
            {project.description || "No description provided."}
          </p>
        </div>

        <div className="single-project-view__panel">
          <h3 className="single-project-view__panel-title">Milestones</h3>
          <p>Milestone data coming soon...</p>
        </div>
      </div>

      <RecentSitePhotosSection project={project} />

      {/* Proper Call Overlay */}
      {showCallOverlay && (
        <CallOverlay
          isOpen={showCallOverlay}
          onClose={handleCloseCall}
          projectId={project.projectID}
          projectName={project.name}
          members={teamMembers}
        />
      )}
    </div>
  );
}