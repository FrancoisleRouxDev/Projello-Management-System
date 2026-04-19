import React, { useState, useEffect } from "react";
import "./settings.css";

// Helper function to decode the JWT token and extract the email (sub claim)
const getUserEmailFromToken = () => {
  const token = localStorage.getItem("token"); // Make sure this matches where you save your JWT on login
  if (!token) return "";
  
  try {
    // JWTs have 3 parts separated by dots. The middle part is the payload.
    const payloadBase64 = token.split('.')[1];
    // Decode the base64 payload
    const decodedPayload = JSON.parse(atob(payloadBase64));
    // Return the 'sub' claim (which contains the email from our C# AuthController)
    return decodedPayload.sub || "";
  } catch (e) {
    console.error("Error decoding token:", e);
    return "";
  }
};

export default function SettingsPage() {
  // Pull the current user's email directly from the decoded JWT token
  const userEmail = getUserEmailFromToken();

  // Existing Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  // Two-Step Verification State
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // --- NEW: Fetch the actual 2FA status from the database when the page loads ---
  useEffect(() => {
    const fetch2FAStatus = async () => {
      if (!userEmail) return;

      try {
        const response = await fetch(`http://localhost:5049/api/auth/2fa-status?email=${encodeURIComponent(userEmail)}`);
        
        if (response.ok) {
          const data = await response.json();
          // Update the React state to match the Database state!
          setIs2FAEnabled(data.is2FAEnabled); 
        }
      } catch (error) {
        console.error("Could not fetch 2FA status:", error);
      }
    };

    fetch2FAStatus();
  }, [userEmail]);

  // Persist theme in localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Handle toggling 2FA (Enable/Disable)
  const handleToggle2FA = async () => {
    setMessage("");

    if (!userEmail) {
      setMessage("Error: User email not found in session. Please log in again.");
      return;
    }

    if (is2FAEnabled) {
      // Logic for disabling 2FA (Optional implementation for later)
      setMessage("Disabling 2FA requires additional backend endpoints. Contact Admin.");
    } else {
      // Flow for enabling 2FA - REAL API CALL
      setLoading(true);
      try {
        const response = await fetch('http://localhost:5049/api/auth/generate-2fa-secret', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail })
        });

        if (response.ok) {
          const data = await response.json();
          // We take the raw authenticator URI from C#, encode it, and feed it to the QR generator
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

  // Handle verifying the 6-digit code - REAL API CALL
  const handleVerifyCode = async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch('http://localhost:5049/api/auth/verify-2fa', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, code: verificationCode }) 
      });
      
      if (response.ok) {
        // Success! The database is now updated.
        setIs2FAEnabled(true);
        setShowSetup(false);
        setVerificationCode("");
        setMessage("Success! Two-Step Verification is enabled and saved to the database.");
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
    <div className="settings-container">
      <h2 className="settings-title">Settings Page</h2>
      
      {message && (
        <div className="settings-message">
          {message}
        </div>
      )}

      {/* Appearance Settings */}
      <div className="settings-section section-bordered">
        <h3>Appearance</h3>
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

      {/* Security Settings */}
      <div className="settings-section">
        <h3>Security</h3>
        <div className="security-toggle-row">
          <span>Two-Step Verification (Authenticator App)</span>
          <button 
            className="btn-standard"
            onClick={handleToggle2FA} 
            disabled={loading || showSetup}
          >
            {is2FAEnabled ? "Disable 2FA" : "Enable 2FA"}
          </button>
        </div>

        {/* Setup 2FA Modal / Inline Section */}
        {showSetup && (
          <div className="setup-2fa-container">
            <h4>Configure Authenticator</h4>
            <ol className="setup-list">
              <li>Download an authenticator app (like Google Authenticator or Authy) on your phone.</li>
              <li>Scan the QR code below:</li>
            </ol>
            
            <div className="qr-container">
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
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}