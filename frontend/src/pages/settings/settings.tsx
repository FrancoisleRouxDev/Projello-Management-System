import React, { useState, useEffect } from "react";
import { createAvatar } from '@dicebear/core';
import { botttsNeutral } from '@dicebear/collection';
import UserDefaultPfp from "../../assets/UserDefaultPfp.svg";
import { useNavigate } from "react-router-dom";
import "./settings.css";
import CustomModal from "../../components/CustomModal";
import CustomSwitch from "../../components/CustomSwitch";

import { message as antdMessage } from "antd";
import { API_BASE_URL } from "../../config";

const getUserInfoFromToken = () => {
  const token = localStorage.getItem("token");
  if (!token) return { id: "", email: "", username: "", avatarSeed: undefined, avatarBg: undefined };

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { id: "", email: "", username: "", avatarSeed: undefined, avatarBg: undefined };

    let payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payloadBase64.length % 4 !== 0) payloadBase64 += '=';

    const decodedPayload = JSON.parse(atob(payloadBase64));

    const id = decodedPayload.sub || decodedPayload.nameid || decodedPayload.id || 
               decodedPayload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] || "";

    return {
      id,
      email: decodedPayload.email || decodedPayload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || "",
      username: decodedPayload.FullName || decodedPayload.fullName || decodedPayload.name || decodedPayload.username || decodedPayload.email || "",
      avatarSeed: decodedPayload.avatarSeed,
      avatarBg: decodedPayload.avatarBg
    };
  } catch (e) {
    console.error("Error decoding token:", e);
    return { id: "", email: "", username: "", avatarSeed: undefined, avatarBg: undefined };
  }
};

export default function SettingsPage() {
  const navigate = useNavigate();

  const { id: userId, email: userEmail, username: userName, avatarSeed: userAvatarSeed, avatarBg: userAvatarBg } = getUserInfoFromToken();

  const BOTTT_SEEDS = [
    "Mackenzie", "Avery", "Adrian", "Vivian", "Destiny", "Jude", "Liliana", "Liam",
    "Emery", "Wyatt", "George", "Jameson", "Kimberly", "Leah", "Alexander", "Ryan",
    "Sarah", "Oliver", "Amaya", "Leo"
  ];

  const [avatarSeed, setAvatarSeed] = useState(userAvatarSeed || userName || "");
  const [avatarBg, setAvatarBg] = useState(userAvatarBg || "");

  // Fetch profile data (avatar) on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { 
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.avatarSeed) setAvatarSeed(data.avatarSeed);
          if (data.avatarBackground) setAvatarBg(data.avatarBackground);
          return;
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      }
    };

    fetchProfile();
  }, [userId]);

  const hasCustomAvatar = !!avatarSeed && !!avatarBg;
  
  // Fixed: backgroundColor must be an array
  const avatarSvg = hasCustomAvatar
    ? createAvatar(botttsNeutral, { 
        seed: avatarSeed, 
        backgroundColor: [`#${avatarBg}`] 
      }).toString()
    : null;

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [modalBg, setModalBg] = useState(avatarBg || "");
  const [modalSelectedSeed, setModalSelectedSeed] = useState<string>(avatarSeed || "");

  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Fetch 2FA status
  useEffect(() => {
    const fetch2FAStatus = async () => {
      if (!userEmail) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/2fa-status?email=${encodeURIComponent(userEmail)}`);
        if (response.ok) {
          const data = await response.json();
          setIs2FAEnabled(data.is2FAEnabled);
        }
      } catch (error) {
        console.error("Could not fetch 2FA status:", error);
      }
    };

    fetch2FAStatus();
  }, [userEmail]);

  // Persist theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleToggle2FA = async () => {
    setMessage("");
    if (!userEmail) {
      setMessage("Error: User email not found in session. Please log in again.");
      return;
    }

    if (is2FAEnabled) {
      setMessage("Disabling 2FA requires additional backend endpoints. Contact Admin.");
    } else {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/generate-2fa-secret`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });

        if (response.ok) {
          const data = await response.json();
          const encodedUri = encodeURIComponent(data.authenticatorUri);
          setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUri}`);
          setShowSetup(true);
        } else {
          const errorData = await response.json();
          setMessage(errorData.message || "Failed to generate 2FA secret.");
        }
      } catch (error) {
        setMessage("Network error. Make sure your ASP.NET Core API is running.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-2fa`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, code: verificationCode }) 
      });
      
      if (response.ok) {
        setIs2FAEnabled(true);
        setShowSetup(false);
        setVerificationCode("");
        setMessage("Success! Two-Step Verification is enabled.");
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || "Invalid verification code.");
      }
    } catch (error) {
      setMessage("Network error. Could not verify code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-outer">
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
        <span className="settings-user">{userEmail && `Signed in as: ${userEmail}`}</span>
      </div>

             {/* Profile Card */}
      <div className="settings-card" style={{ marginBottom: 24 }}>
        <h3 className="settings-card-title">Profile</h3>
        <div className="settings-card-content" style={{ flexDirection: "row", alignItems: "center", gap: 32 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 120 }}>
            {hasCustomAvatar && avatarSvg ? (
              <img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg)}`}
                alt="Avatar Preview"
                style={{ width: 80, height: 80, borderRadius: "50%", background: `#${avatarBg}`, cursor: "pointer", boxShadow: "0 2px 8px #0001" }}
                onClick={() => {
                  setModalBg(avatarBg || "");
                  setModalSelectedSeed(avatarSeed || "");
                  setShowAvatarModal(true);
                }}
                title="Click to change avatar"
              />
            ) : (
              <img
                src={UserDefaultPfp}
                alt="Default User Avatar"
                style={{ width: 80, height: 80, borderRadius: "50%", background: "#C5D3C9", cursor: "pointer", boxShadow: "0 2px 8px #0001" }}
                title="Click to change avatar"
                onClick={() => {
                  setModalBg("");
                  setModalSelectedSeed("");
                  setShowAvatarModal(true);
                }}
              />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 10 }}><b>Username:</b> {userName}</div>
            <div style={{ marginBottom: 10 }}><b>Email:</b> {userEmail}</div>
          </div>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      {showAvatarModal && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "#0008", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-content" style={{ background: "var(--secondary-background)", borderRadius: 16, padding: 32, minWidth: 400, maxWidth: 600, boxShadow: "0 4px 32px #0003", position: "relative" }}>
            <button onClick={() => setShowAvatarModal(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 24, cursor: "pointer" }}>&times;</button>
            <h3 style={{ marginTop: 0 }}>Choose Your Avatar</h3>
            
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 16, justifyContent: "space-between" }}>
              <div className="colorPicker" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <label><b>Choose Background Colour |</b></label>
                <input
                  type="color"
                  value={`#${modalBg}`}
                  onChange={e => setModalBg(e.target.value.replace('#', ''))}
                  style={{ width: 44, height: 44, border: "none", background: "none", cursor: "pointer" }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginLeft: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-dark)', marginBottom: 2 }}>HEX</span>
                <input
                  type="text"
                  value={modalBg}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
                    if (val.length <= 6) setModalBg(val);
                  }}
                  placeholder="e.g. ffa000"
                  style={{ width: 100, background: "#cccccc70", border: "none", outline: "none", color: "var(--text-dark)", fontFamily: "Roboto", fontWeight: 500, fontSize: 16, borderRadius: 10, padding: "2px 4px" }}
                  maxLength={6}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center", maxHeight: 320, overflowY: "auto" }}>
              {BOTTT_SEEDS.map(seed => (
                <div key={seed} 
                     style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", 
                              border: modalSelectedSeed === seed ? "2px solid #ffa000" : "2px solid transparent", 
                              borderRadius: 12, padding: 6, background: modalSelectedSeed === seed ? "#fffbe6" : "#f7f7f3" }} 
                     onClick={() => setModalSelectedSeed(seed)}>
                  <span
                    style={{ width: 64, height: 64, display: 'inline-block', borderRadius: '50%', marginBottom: 4, background: `#${modalBg}`, overflow: 'hidden' }}
                    dangerouslySetInnerHTML={{
                      __html: createAvatar(botttsNeutral, { 
                        seed, 
                        backgroundColor: [`#${modalBg}`]   // ← Fixed here
                      }).toString()
                    }}
                  />
                  <span style={{ fontSize: 13, color: "#28332b" }}>{seed}</span>
                </div>
              ))}
            </div>

            <button
              className="btn-primary"
              style={{ marginTop: 24, width: "100%" }}
              onClick={async () => {
                setAvatarSeed(modalSelectedSeed);
                setAvatarBg(modalBg);
                setShowAvatarModal(false);

                const token = localStorage.getItem("token");
                if (!token || !userId) {
                  antdMessage.error("Could not determine user ID.");
                  return;
                }

                try {
                  const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                    method: "PUT",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                      fullName: userName,
                      email: userEmail,
                      avatarSeed: modalSelectedSeed,
                      avatarBackground: modalBg
                    })
                  });

                  if (response.ok) {
                    antdMessage.success("Avatar updated!");
                    window.location.reload();
                  } else {
                    const errorData = await response.json().catch(() => ({}));
                    antdMessage.error(errorData?.[0]?.description || errorData?.message || "Failed to update avatar.");
                  }
                } catch (e) {
                  antdMessage.error("Network error updating avatar.");
                }
              }}
            >
              Save Avatar
            </button>
          </div>
        </div>
      )}

      {message && <div className="settings-message">{message}</div>}

      <div className="settings-cards">
        <div className="settings-card">
          <h3 className="settings-card-title">Appearance</h3>
          <div className="settings-card-content">
            <label className="theme-switch">
              <input
                type="checkbox"
                checked={theme === "dark"}
                onChange={e => setTheme(e.target.checked ? "dark" : "light")}
              />
              <span className="slider"></span>
              <span className="theme-label-text">
                {theme === "dark" ? "Dark" : "Light"} Mode
              </span>
            </label>
          </div>
        </div>

        <div className="settings-card">
          <h3 className="settings-card-title">Security</h3>
          <div className="settings-card-content">
            <div className="security-toggle-row">
              <span>Two-Step Verification (Authenticator App)</span>
              <CustomSwitch
                checked={is2FAEnabled}
                onChange={() => handleToggle2FA()}
                disabled={loading || showSetup}
                label={is2FAEnabled ? "On" : "Off"}
              />
            </div>

            <CustomModal
              open={showSetup}
              onCancel={() => { setShowSetup(false); setMessage(""); }}
              title="Configure Authenticator"
              footer={null}
            >
              <ol className="setup-list">
                <li>Download an authenticator app (like Google Authenticator or Authy) on your phone.</li>
                <li>Scan the QR code below:</li>
              </ol>
              <div className="qr-container" style={{ textAlign: "center", margin: "16px 0" }}>
                {qrCodeUrl ? <img src={qrCodeUrl} alt="2FA QR Code" /> : "Loading QR code..."}
              </div>
              <p>3. Enter the 6-digit code generated by the app to verify.</p>
              <div className="input-group">
                <input
                  className="code-input"
                  type="text"
                  placeholder="000 000"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  style={{ marginRight: 8 }}
                />
                <button
                  className="btn-primary"
                  onClick={handleVerifyCode}
                  disabled={loading || verificationCode.length < 6}
                >
                  Verify & Save
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => { setShowSetup(false); setMessage(""); }}
                  disabled={loading}
                  style={{ marginLeft: 8 }}
                >
                  Cancel
                </button>
              </div>
            </CustomModal>
          </div>
        </div>

        <div className="settings-card settings-card-logout">
          <h3 className="settings-card-title">Session</h3>
          <div className="settings-card-content">
            <button
              className="btn-primary btn-logout"
              onClick={() => {
                localStorage.removeItem("token");
                navigate("/login");
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}