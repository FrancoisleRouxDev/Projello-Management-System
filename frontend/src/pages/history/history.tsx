import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../../config"; 
import "./history.css";

// Interface definitions aligning with Projello's UpdateReadDto contracts
interface ReactionDisplay {
  reactionID: number;
  updateID: number;
  userID: string;
  emoji: string;
}

interface ProgressUpdateItem {
  updateID: number;
  milestoneID: number;
  milestoneTitle?: string;
  projectID?: number;
  projectName?: string;
  userID: string;
  userFullName: string;
  optionalComment: string;
  updateDate: string;
  createdAt: string;
  reactions: ReactionDisplay[];
}

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
  // Parallel Core States
  const [updates, setUpdates] = useState<ProgressUpdateItem[]>([]);
  const [completedProjects, setCompletedProjects] = useState<CompletedProjectItem[]>([]);
  
  // UI Control States
  const [activeTab, setActiveTab] = useState<"stream" | "archive">("stream");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("All");

  // FIX 1: Using strict graphical symbols expected by your backend API validations
  const supportedEmojis = ["👍", "❤️", "🔥", "👏", "⚠️"];

  useEffect(() => {
    loadDashboardData();
  }, [activeTab]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      if (activeTab === "stream") {
        await fetchHistoryLog();
      } else {
        await fetchCompletedProjectsArchive();
      }
    } catch (err: any) {
      setError(err.message || "Failed to load history metrics.");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryLog = async () => {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/api/updates`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Daily Log sync failed with code: ${response.status}`);
    }
    const data = await response.json();
    setUpdates(data);
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

  const handleAddReaction = async (updateId: number, emoji: string) => {
    try {
      const token = localStorage.getItem("token");
      // FIX 2: Corrected matching endpoint route path to point to plural /reactions
      const response = await fetch(`${API_BASE_URL}/api/updates/${updateId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ emoji }),
      });

      if (response.ok) {
        // Highly targeted update logic to avoid resetting the layout view hierarchy completely
        fetchHistoryLog();
      }
    } catch (err) {
      console.error("Failed to push reaction metadata to context server:", err);
    }
  };

  // Advanced Frontend Query Filtering Engines
  const filteredUpdates = updates.filter(item => {
    const matchesSearch = (item.userFullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.optionalComment || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = selectedProjectFilter === "All" || item.projectName === selectedProjectFilter;
    return matchesSearch && matchesProject;
  });

  const filteredArchive = completedProjects.filter(proj => 
    proj.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (proj.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Extract unique array of project names for dynamic filtering selection box
  const dynamicProjectList = Array.from(new Set(updates.map(u => u.projectName).filter(Boolean)));

  return (
    <div className="history-page-container">
      {/* Top Banner Control Board */}
      <header className="history-header">
        <div>
          <h2 className="history-title">System History & Archival Audits</h2>
          <p className="history-subtitle">
            Review site progress parameters, check-in sentiments, and verified closed project scopes.
          </p>
        </div>
        <div className="header-actions">
          <button className="refresh-history-btn" onClick={loadDashboardData} disabled={loading}>
            {loading ? "Syncing Workspace..." : "Force Sync Data"}
          </button>
        </div>
      </header>

      {/* Navigation Tab Interface Wrapper */}
      <div className="history-tabs-nav">
        <button 
          className={`tab-toggle-btn ${activeTab === "stream" ? "tab-active" : ""}`}
          onClick={() => { setActiveTab("stream"); setSearchQuery(""); }}
        >
          ⏱️ Active Check-In Stream ({updates.length})
        </button>
        <button 
          className={`tab-toggle-btn ${activeTab === "archive" ? "tab-active" : ""}`}
          onClick={() => { setActiveTab("archive"); setSearchQuery(""); }}
        >
          🗄️ Completed Projects Archive ({completedProjects.length})
        </button>
      </div>

      {/* Real-time Dynamic Searching and Category Filters */}
      <div className="history-control-filter-bar">
        <div className="search-input-wrapper">
          <input 
            type="text" 
            placeholder={activeTab === "stream" ? "Search logs by username or text phrases..." : "Filter archive by project name or briefs..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-search-box"
          />
        </div>
        
        {activeTab === "stream" && dynamicProjectList.length > 0 && (
          <div className="dropdown-filter-wrapper">
            <select 
              value={selectedProjectFilter} 
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="filter-dropdown-select"
            >
              <option value="All">All Projects Portfolio</option>
              {dynamicProjectList.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <div className="history-error-alert">Security or Connection Interruption: {error}</div>}

      {/* Main Panel Operations Render */}
      {loading ? (
        <div className="history-skeleton-loader">
          <div className="spinner-element"></div>
          <p>Compiling historical data arrays from Projello Cloud Core...</p>
        </div>
      ) : activeTab === "stream" ? (
        /* TAB 1: LOG STREAM VIEWER */
        filteredUpdates.length === 0 ? (
          <div className="history-empty-state">
            <p>No historical updates match your active query constraints.</p>
          </div>
        ) : (
          <div className="history-timeline">
            {filteredUpdates.map((item) => (
              <div key={item.updateID} className="history-card">
                <div className="history-card-header">
                  <div className="user-meta">
                    <div className="user-badge-avatar">
                      {item.userFullName ? item.userFullName.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div>
                      <h4 className="user-name">{item.userFullName || "On-Site Operative"}</h4>
                      <span className="timestamp-badge">
                        {new Date(item.updateDate || item.createdAt).toLocaleDateString(undefined, {
                          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {(item.projectName || item.milestoneTitle) && (
                    <div className="context-indicator">
                      <span className="project-tag">{item.projectName}</span>
                      <span className="milestone-tag">Milestone: {item.milestoneTitle || "Unlinked"}</span>
                    </div>
                  )}
                </div>

                <div className="history-card-body">
                  <p className="update-comment">
                    {item.optionalComment ? `"${item.optionalComment}"` : "Checked-in with standard baseline parameters."}
                  </p>
                </div>

                <div className="history-card-footer">
                  <div className="active-reactions-list">
                    {item.reactions && item.reactions.length > 0 && (
                      Object.entries(
                        item.reactions.reduce((acc: { [key: string]: number }, r) => {
                          acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([emoji, count]) => (
                        <span key={emoji} className="reaction-bubble">
                          <span className="reaction-symbol">{emoji}</span>
                          <span className="reaction-count">{count}</span>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="quick-emoji-picker">
                    {supportedEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        title={`Tag status as ${emoji}`}
                        className="emoji-picker-btn"
                        onClick={() => handleAddReaction(item.updateID, emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* TAB 2: COMPLETED PROJECTS ARCHIVE */
        filteredArchive.length === 0 ? (
          <div className="history-empty-state">
            <p>No completed or archived project rows detected inside this operational footprint.</p>
          </div>
        ) : (
          <div className="archive-grid-layout">
            {filteredArchive.map((project) => (
              <div key={project.projectID} className="archive-project-card">
                <div className="archive-card-status-badge">✓ ARCHIVED SECURELY</div>
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