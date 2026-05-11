// frontend/src/components/CallOverlay.tsx
import React, { useEffect, useRef } from "react";
import { useProjectCall } from "../features/realtime/hooks/useProjectCall";
import "./CallOverlay.css";

interface CallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  projectName: string;
  members: any[];
}

const CallOverlay: React.FC<CallOverlayProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  members,
}) => {
  const {
    joinCall,
    leaveCall,
    isJoined,
    localStream,
    remoteStream,
    connectionState,
    isFetching,
    error,
  } = useProjectCall(projectId);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!isOpen) return null;

  return (
    <div className="call-overlay-wrapper">
      <div className="overlay-backdrop" onClick={onClose}>
        <div className="overlay-container" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="overlay-header">
            <div>
              <h2>{projectName}</h2>
              <p className="call-subtitle">Voice & Video Call</p>
            </div>
            <button className="close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>

          {!isJoined ? (
            /* ==================== PRE-CALL SCREEN ==================== */
            <div className="pre-call-screen">
              <div className="participants-section">
                <h3>Team Members ({members.length})</h3>
                <div className="user-list">
                  {members.length > 0 ? (
                    members.map((member) => (
                      <div key={member.UserID || member.id} className="user-item">
                        <div className="avatar">
                          {(member.FullName || member.name || "?").charAt(0)}
                        </div>
                        <div className="user-info">
                          <span className="user-name">
                            {member.FullName || member.fullName || member.Name || "Unknown User"}
                          </span>
                          {member.AssignedAs && (
                            <span className="user-role">{member.AssignedAs}</span>
                          )}
                        </div>
                        <input type="checkbox" defaultChecked className="user-checkbox" />
                      </div>
                    ))
                  ) : (
                    <p>No team members found.</p>
                  )}
                </div>
              </div>

              <div className="pre-call-actions">
                <button
                  onClick={joinCall}
                  className="btn-join"
                  disabled={isFetching}
                >
                  {isFetching ? "Connecting..." : "Join Call"}
                </button>
                <button onClick={onClose} className="btn-cancel">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* ==================== ACTIVE CALL SCREEN ==================== */
            <div className="call-screen">
              <div className="video-grid">
                {/* Local Video */}
                <div className="video-tile self">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="video"
                  />
                  <div className="video-label">You</div>
                </div>

                {/* Remote Video */}
                <div className="video-tile">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="video"
                  />
                  <div className="video-label">Remote</div>
                </div>
              </div>

              {/* Status */}
              <div className="call-status">
                <p>{connectionState}</p>
                {error && <p className="error-text">{error}</p>}
              </div>

              {/* Bottom Controls */}
              <div className="call-controls">
                <button className="control-btn">🎤 Mute</button>
                <button className="control-btn">📹 Stop Video</button>
                <button className="control-btn">🖥️ Share Screen</button>
                <button onClick={leaveCall} className="control-btn end-call">
                  End Call
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallOverlay;