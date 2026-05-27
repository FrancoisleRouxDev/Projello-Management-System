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

export default function HistoryPage() {
  const [updates, setUpdates] = useState<ProgressUpdateItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // Clean lookup array using text-based descriptors instead of graphical emojis
  const supportedEmojis = ["Thumbs Up", "Worker", "Warning", "Check", "Cross"];

  useEffect(() => {
    fetchHistoryLog();
  }, []);

  const fetchHistoryLog = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/updates`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned status code ${response.status}`);
      }

      const data = await response.json();
      setUpdates(data);
    } catch (err: any) {
      console.error("Error loading historical updates:", err);
      setError(err.message || "Failed to download your activity history.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddReaction = async (updateId: number, emoji: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/updates/${updateId}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ emoji }),
      });

      if (response.ok) {
        // Refresh feed to show updated reaction counts
        fetchHistoryLog();
      }
    } catch (err) {
      console.error("Failed to append reaction payload:", err);
    }
  };

  return (
    <div className="history-page-container">
      <header className="history-header">
        <div>
          <h2 className="history-title">Daily Check-In Log</h2>
          <p className="history-subtitle">
            Review past 30-second on-site progress updates, team sentiments, and milestone modifications.
          </p>
        </div>
        <button className="refresh-history-btn" onClick={fetchHistoryLog} disabled={loading}>
          {loading ? "Syncing..." : "Sync Log"}
        </button>
      </header>

      {error && <div className="history-error-alert">Error: {error}</div>}

      {loading ? (
        <div className="history-skeleton-loader">
          <p>Downloading construction history logs...</p>
        </div>
      ) : updates.length === 0 ? (
        <div className="history-empty-state">
          <p>No historical 30-second progress entries recorded for this system footprint yet.</p>
        </div>
      ) : (
        <div className="history-timeline">
          {updates.map((item) => (
            <div key={item.updateID} className="history-card">
              <div className="history-card-header">
                <div className="user-meta">
                  <div className="user-badge-avatar">
                    {item.userFullName ? item.userFullName.charAt(0).toUpperCase() : "?"}
                  </div>
                  <div>
                    <h4 className="user-name">{item.userFullName || "Unknown On-Site Worker"}</h4>
                    <span className="timestamp-badge">
                      {new Date(item.updateDate || item.createdAt).toLocaleDateString(undefined, {
                        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                
                {(item.projectName || item.milestoneTitle) && (
                  <div className="context-indicator">
                    <span className="project-tag">{item.projectName || "Project"}</span>
                    <span className="milestone-tag">Milestone: {item.milestoneTitle || "Reference"}</span>
                  </div>
                )}
              </div>

              <div className="history-card-body">
                <p className="update-comment">
                  {item.optionalComment ? `"${item.optionalComment}"` : "Checked-in with no additional text notes."}
                </p>
              </div>

              <div className="history-card-footer">
                {/* Existing Reaction counters */}
                <div className="active-reactions-list">
                  {item.reactions && item.reactions.length > 0 && (
                    Object.entries(
                      item.reactions.reduce((acc: { [key: string]: number }, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([emoji, count]) => (
                      <span key={emoji} className="reaction-bubble">
                        <span className="reaction-label">{emoji}:</span> <span className="reaction-count">{count}</span>
                      </span>
                    ))
                  )}
                </div>

                {/* Quick Interactive Quick Reaction Picker panel */}
                <div className="quick-emoji-picker">
                  {supportedEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      title={`React with ${emoji}`}
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
      )}
    </div>
  );
}