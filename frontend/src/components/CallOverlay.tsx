import React, { useEffect, useRef, useState } from "react";
import { useProjectCall } from "../features/realtime/hooks/useProjectCall";
import "./CallOverlay.css";
import outgoingRingtoneSrc from "../assets/notifcations/mixkit-waiting-ringtone-1354.wav";

const outgoingRingtone = new Audio(outgoingRingtoneSrc);
outgoingRingtone.loop = true;

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
    ringUsers,                    // ← ADDED
    isJoined,
    localStream,
    remoteStream,
    connectionState,
    isFetching,
    error,
    checkActiveParticipants,   // ← NEW

    // Camera controls (add these)
    cameraEnabled,
    activeVideoDeviceId,
    videoDevices,
    refreshVideoDevices,
    turnCameraOff,
    turnCameraOn,
    switchCamera,   // ← NEW
  } = useProjectCall(projectId);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);

  // NEW: Track how many people are already in the call
  const [activeParticipants, setActiveParticipants] = useState<string[]>([]);

  // ADDED: Selected members for ringing
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const toggleMember = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // After attaching local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(console.error);
    }
  }, [localStream]);

  // After attaching remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(console.error);
    }
  }, [remoteStream]);

  // NEW: Check if a call is already running when the overlay opens
  useEffect(() => {
    if (isOpen && !isJoined && checkActiveParticipants) {
      const check = async () => {
        try {
          const parts = await checkActiveParticipants();
          setActiveParticipants(parts || []);
        } catch (e) {
          setActiveParticipants([]);
        }
      };
      check();
    }
  }, [isOpen, isJoined, checkActiveParticipants]);


  useEffect(() => {
    if (isJoined) {
      outgoingRingtone.pause();
      outgoingRingtone.currentTime = 0;
    }
  }, [isJoined]);


  // Stop outgoing ringtone when call is connected
  useEffect(() => {
    if (!isOpen && !isJoined) {
      outgoingRingtone.pause();
      outgoingRingtone.currentTime = 0;
    }
  }, [isOpen, isJoined]);


  useEffect(() => {
    const handleAutoJoin = () => {
      joinCall();
    };

    window.addEventListener("auto-join-call", handleAutoJoin);
    return () => window.removeEventListener("auto-join-call", handleAutoJoin);
  }, [joinCall]);


  const handleTurnCameraOff = async () => {
    if (turnCameraOff) await turnCameraOff();
    setCameraMenuOpen(false);
  };

  const handleTurnCameraOn = async () => {
    if (turnCameraOn) await turnCameraOn();
    setCameraMenuOpen(false);
  };

  const handleSwitchCamera = async (deviceId: string) => {
    if (switchCamera) await switchCamera(deviceId);
    setCameraMenuOpen(false);
  };

  // ADDED: Handle ringing selected members then joining
  const handleStartOrRing = async () => {
    outgoingRingtone.currentTime = 0;
    outgoingRingtone.play().catch(console.error);
    try {
      if (selectedUserIds.length > 0 && ringUsers) {
        await ringUsers(selectedUserIds);   // Ring selected members first
      }
      await joinCall();                     // Then join the call room
    } catch (err: any) {
      outgoingRingtone.pause();
      outgoingRingtone.currentTime = 0;
      console.error("Failed to ring or start call:", err);
    }
  };

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
                    members.map((member) => {
                      const userId = member.UserID || member.id || member.userId;
                      const name = member.FullName || member.fullName || member.Name || "Unknown User";

                      return (
                        <div
                          key={userId}
                          className="user-item"
                          onClick={() => toggleMember(userId)}
                        >
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
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(userId)}
                            onChange={() => toggleMember(userId)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <p>No team members found.</p>
                  )}
                </div>
              </div>

              <div className="pre-call-actions">
                <button
                  onClick={handleStartOrRing}           // ← CHANGED
                  className="btn-join"
                  disabled={isFetching}
                >
                  {isFetching
                    ? "Connecting..."
                    : selectedUserIds.length > 0
                      ? `Ring ${selectedUserIds.length} & Join Call`
                      : activeParticipants.length > 0
                        ? `Join Call (${activeParticipants.length} active)`
                        : "Start Call"
                  }
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
                <div className="camera-control">
                  <button
                    type="button"
                    className={`control-btn camera-btn ${cameraEnabled ? "is-on" : "is-off"}`}
                    onClick={() => setCameraMenuOpen((open) => !open)}
                    aria-haspopup="menu"
                  >
                    {cameraEnabled ? "📹 Camera" : "📷 Camera Off"}
                  </button>

                  {cameraMenuOpen && (
                    <div className="camera-menu">
                      {cameraEnabled ? (
                        <button
                          type="button"
                          className="camera-menu__item"
                          onClick={handleTurnCameraOff}
                        >
                          Turn camera off
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="camera-menu__item"
                          onClick={handleTurnCameraOn}
                        >
                          Turn camera on
                        </button>
                      )}

                      <div className="camera-menu__divider" />

                      {videoDevices && videoDevices.length > 0 ? (
                        videoDevices.map((device, index) => {
                          const label = device.label || `Camera ${index + 1}`;
                          const isActive = device.deviceId === activeVideoDeviceId;
                          return (
                            <button
                              key={device.deviceId}
                              type="button"
                              className={`camera-menu__item ${isActive ? "is-active" : ""}`}
                              onClick={() => handleSwitchCamera(device.deviceId)}
                            >
                              {label} {isActive ? " (active)" : ""}
                            </button>
                          );
                        })
                      ) : (
                        <div className="camera-menu__empty">No other cameras detected</div>
                      )}
                    </div>
                  )}
                </div>

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