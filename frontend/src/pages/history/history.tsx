import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Hook imported for navigation
import { API_BASE_URL } from "../../config"; 
import "./history.css";

// Interface definitions aligning with Projello's contracts
interface CompletedProjectItem {
  projectID: number;
  name: string;
  description: string;
  startDate: string;
  dueDate: string;
  status: string;
  clientName?: string;
}

export default function HistoryPage() {
  const navigate = useNavigate(); // Hook initialized

  // Core States
  const [completedProjects, setCompletedProjects] = useState<CompletedProjectItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    fetchCompletedProjectsArchive();
  }, []);

  const fetchCompletedProjectsArchive = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      
      // Calls the Projects Controller filtering for completed parameters
      const response = await fetch(`${API_BASE_URL}/api/projects?status=Completed`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Archive retrieval failed with code: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Strict client-side verification to guarantee only "Completed" projects are held in state
      const filtered = data.filter((p: any) => p.status === "Completed");
      setCompletedProjects(filtered);
    } catch (err: any) {
      setError(err.message || "Failed to load historical project records.");
    } finally {
      setLoading(false);
    }
  };

  // Frontend Query Filtering Engine
  const filteredArchive = completedProjects.filter(proj => 
    proj.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (proj.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="history-page-container">
      {/* Top Banner Control Board */}
      <header className="history-header">
        <div>
          <h2 className="history-title">Completed Projects Archive</h2>
          <p className="history-subtitle">
            Review full-scope summaries, timelines, and accounts for verified closed operations.
          </p>
        </div>
        <div className="header-actions">
          <button className="refresh-history-btn" onClick={fetchCompletedProjectsArchive} disabled={loading}>
            {loading ? "Syncing Workspace..." : "Force Sync Data"}
          </button>
        </div>
      </header>

      {/* Real-time Dynamic Searching Filter Bar */}
      <div className="history-control-filter-bar">
        <div className="search-input-wrapper">
          <input 
            type="text" 
            placeholder="Filter archive by project name or briefs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-search-box"
          />
        </div>
      </div>

      {error && <div className="history-error-alert">Connection Interruption: {error}</div>}

      {/* Main Operations Render View */}
      {loading ? (
        <div className="history-skeleton-loader">
          <div className="spinner-element"></div>
          <p>Compiling closed project arrays from Projello Cloud Core...</p>
        </div>
      ) : filteredArchive.length === 0 ? (
        <div className="history-empty-state">
          <p>No completed project records detected matching your active query constraints.</p>
        </div>
      ) : (
        <div className="archive-grid-layout">
          {filteredArchive.map((project) => (
            <div 
              key={project.projectID} 
              className="archive-project-card"
              onClick={() => navigate(`/single-view/${project.projectID}`)}
              style={{ cursor: "pointer" }} // Adds standard user affordance pointer feedback
            >
              <div className="archive-card-status-badge">COMPLETED</div>
              <h3 className="archive-project-title">{project.name}</h3>
              <span className="archive-client-label">Client Account: {project.clientName || "Internal Account"}</span>
              <p className="archive-project-desc">
                {project.description || "No project text summary provided upon closing initialization."}
              </p>
              
              <div className="archive-project-meta-footer">
                <div>
                  <strong>Began:</strong> {project.startDate ? new Date(project.startDate).toLocaleDateString() : "N/A"}
                </div>
                <div>
                  <strong>Closed:</strong> {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : "N/A"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}