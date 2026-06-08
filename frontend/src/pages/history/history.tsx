import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config"; 
import "./history.css";

// Interface definitions aligning with Projello's UpdateReadDto contracts
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
  // Core State
  const [completedProjects, setCompletedProjects] = useState<CompletedProjectItem[]>([]);
  
  // UI Control States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      await fetchCompletedProjectsArchive();
    } catch (err: any) {
      setError(err.message || "Failed to load history metrics.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedProjectsArchive = async () => {
    const token = localStorage.getItem("token");
    // Calls the Projects Controller filtering for closed/archived parameters
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
    // Fallback filter client-side if the endpoint returns all statuses
    const filtered = data.filter((p: any) => p.status === "Completed" || p.status === "Archived");
    setCompletedProjects(filtered);
  };

  // Advanced Frontend Query Filtering Engines
  const filteredArchive = completedProjects.filter(proj => 
    proj.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (proj.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="history-page-container">
      {/* Top Banner Control Board */}
      <header className="history-header">
        <div>
          <h2 className="history-title">System History & Archival Audits</h2>
          <p className="history-subtitle">
            Review verified closed project scopes and historical data.
          </p>
        </div>
        <div className="header-actions">
          <button className="refresh-history-btn" onClick={loadDashboardData} disabled={loading}>
            {loading ? "Syncing Workspace..." : "Force Sync Data"}
          </button>
        </div>
      </header>

      {/* Real-time Dynamic Searching */}
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

      {error && <div className="history-error-alert">Security or Connection Interruption: {error}</div>}

      {/* Main Panel Operations Render */}
      {loading ? (
        <div className="history-skeleton-loader">
          <div className="spinner-element"></div>
          <p>Compiling historical data arrays from Projello Cloud Core...</p>
        </div>
      ) : (
        /* COMPLETED PROJECTS ARCHIVE */
        filteredArchive.length === 0 ? (
          <div className="history-empty-state">
            <p>No completed or archived project rows detected inside this operational footprint.</p>
          </div>
        ) : (
          <div className="archive-grid-layout">
            {filteredArchive.map((project) => (
              <div key={project.projectID} className="archive-project-card">
                <div className="archive-card-status-badge">ARCHIVED SECURELY</div>
                <h3 className="archive-project-title">{project.name}</h3>
                <span className="archive-client-label">Client Account: {project.clientName || "Internal Account"}</span>
                <p className="archive-project-desc">{project.description || "No project text summary provided upon closing initialization."}</p>
                
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
        )
      )}
    </div>
  );
}