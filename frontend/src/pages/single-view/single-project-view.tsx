import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./single-project-view.css";
import CallOverlay from "../../components/CallOverlay";
import { useProjectMember } from "../../features/realtime/hooks/useProjectMember";
import { API_BASE_URL } from "../../config";
import AddProjectMemberModal from "../../components/AddProjectMemberModal";   

type ProjectDetails= {
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

type SiteImageUpdate = {
  id: number;
  projectId: number;
  userId: string;
  caption: string | null;
  imageUrl: string;
  createdAt: string;
};

function RecentSitePhotosSection({ 
  updates, 
  onAddPhoto, 
  isUploading 
}: { 
  updates: SiteImageUpdate[]; 
  onAddPhoto: () => void; 
  isUploading: boolean;
}) {
  const recentImages = updates.slice(0, 6);

  return (
    <section className="single-project-view__photo-section">
      <div className="single-project-view__panel-header-row">
        <h3 className="single-project-view__panel-title">Recent Site Photos</h3>
        <button 
          type="button" 
          className="single-project-view__view-all-button"
          onClick={() => console.log("Navigate to Gallery")}
        >
          View All →
        </button>
      </div>

      <div style={{
        display: "flex",
        gap: "12px",
        overflowX: "auto",
        paddingBottom: "12px",
        scrollbarWidth: "thin"
      }}>
        {/* Add Photo Button - Now Functional */}
        <button 
          type="button" 
          className="single-project-view__photo-tile single-project-view__photo-tile--add"
          style={{ minWidth: "140px", height: "110px", flexShrink: 0 }}
          onClick={onAddPhoto}
          disabled={isUploading}
        >
          <span className="single-project-view__photo-plus">+</span>
          <span className="single-project-view__photo-label">
            {isUploading ? "Uploading..." : "Add Photo"}
          </span>
        </button>

        {/* Images from Database */}
        {recentImages.length > 0 ? (
          recentImages.map((update) => (
            <div
              key={update.id}
              className="single-project-view__photo-tile"
              style={{ 
                backgroundImage: `url(${update.imageUrl})`, 
                backgroundSize: "cover", 
                backgroundPosition: "center",
                minWidth: "160px",
                height: "110px",
                flexShrink: 0,
                borderRadius: "10px",
                cursor: "pointer"
              }}
              onClick={() => console.log("Clicked image:", update)}
            />
          ))
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <div 
              key={i} 
              className="single-project-view__photo-tile single-project-view__photo-tile--placeholder" 
              style={{ minWidth: "160px", height: "110px", flexShrink: 0 }}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default function SingleProjectViewPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCallOverlay, setShowCallOverlay] = useState(false);

  // New state for Add Member Modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<number>(0);

  // Correct logic from old version
  const { members: teamMembers, loading: membersLoading } = useProjectMember(projectId || "");


  //Site Update State
  const [siteUpdates, setSiteUpdates] = useState<SiteImageUpdate[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current user role
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const role = parseInt(payload.RoleID || payload["RoleID"] || "0");
        setCurrentUserRole(role);
      } catch (e) {
        console.error("Failed to decode token for role");
      }
    }
  }, []);

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

        const data: ProjectDetails = await res.json();
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


  // Fetch Site Updates
  const fetchSiteUpdates = async () => {
    if (!projectId) return;

    setUpdatesLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/updates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) throw new Error("Failed to fetch updates");

      const data: SiteImageUpdate[] = await res.json();
      setSiteUpdates(data);
      console.log("Site Updates fetched:", data);
    } catch (err) {
      console.error("Error fetching site updates:", err);
    } finally {
      setUpdatesLoading(false);
    }
  };

  // Fetch updates when project loads
  useEffect(() => {
    if (projectId) {
      fetchSiteUpdates();
    }
  }, [projectId]);


  //Upload Functions
  const handleAddPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    setIsUploading(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("Image", file);
      formData.append("Caption", "");

      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/updates`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to upload image");
      }

      await fetchSiteUpdates();
      alert("Photo uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      alert("Failed to upload photo: " + err.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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

      {/* Pass upload handlers to the component */}
      <RecentSitePhotosSection 
        updates={siteUpdates} 
        onAddPhoto={handleAddPhoto}
        isUploading={isUploading}
      />

      {/* Hidden file input for upload */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Team Members Section + Add Button */}
      <div className="single-project-view__panel">
        <div className="single-project-view__panel-header-row">
          <h3 className="single-project-view__panel-title">Team Members ({teamMembers.length})</h3>
          
          {/* Only Owners (4) and Admins (1) can add members */}
          {[1, 4].includes(currentUserRole) && (
            <button 
              onClick={() => setShowAddMemberModal(true)}
              className="single-project-view__view-all-button"
              style={{ color: "#0a0a0a", fontWeight: "600" }}
            >
              + Add Member
            </button>
          )}
        </div>

        {teamMembers.length === 0 ? (
          <p>No team members yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {teamMembers.map((m: any) => (
              <div key={m.UserID} style={{ padding: "8px", background: "#f8fafc", borderRadius: "8px" }}>
                {m.FullName || m.fullName} — <strong>{m.AssignedAs || m.assignedAs}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

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

      {/* Add Member Modal */}
      <AddProjectMemberModal
        open={showAddMemberModal}
        onClose={() => setShowAddMemberModal(false)}
        projectId={project.projectID}
        onMemberAdded={() => {
          // The useProjectMember hook will automatically refresh
          console.log("Member added - list should refresh");
        }}
      />
    </div>
  );
}