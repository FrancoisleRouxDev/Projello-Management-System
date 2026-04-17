import React, { useState } from "react";
import Logo from "../../assets/Frame 106.svg";
import "./SignupPage.css";

interface SignUpPageProps {
  onSwitchToLogin: () => void;
}

// FIX: Exported as a standard function to prevent TS2786 errors
export default function SignUpPage({ onSwitchToLogin }: SignUpPageProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [roleID, setRoleID] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5049/api/Auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, roleID }),
      });

      if (!response.ok) {
        let errorMessage = "Registration failed. Please check your information.";
        
        try {
          // Attempt to parse the JSON error response
          const data = await response.json();
          
          if (Array.isArray(data) && data[0]?.description) {
            errorMessage = data[0].description;
          } else if (data.errors) {
            const firstErrorKey = Object.keys(data.errors)[0];
            errorMessage = data.errors[firstErrorKey][0];
          } else if (typeof data === "string") {
            errorMessage = data;
          } else if (data.message) {
            errorMessage = data.message;
          }
        } catch (jsonError) {
          // Fallback if the server sends a raw 500 HTML page instead of JSON
          if (response.status === 500) {
            errorMessage = "Internal Server Error (500). The database or backend crashed.";
          }
        }

        setError(errorMessage);
        setLoading(false);
        return;
      }

      setSuccessMsg("Registration successful! Redirecting to login...");
      setTimeout(() => {
        onSwitchToLogin();
      }, 1500);
      
    } catch {
      setError("Could not connect to server. Is the API running?");
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-left">
        <div className="signup-card">
          <h1 className="signup-title">Sign Up</h1>

          <form onSubmit={handleRegister}>
            <input
              className="signup-input"
              type="text"
              placeholder="Full Name..."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <input
              className="signup-input"
              type="email"
              placeholder="Email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              className="signup-input"
              type="password"
              placeholder="Password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <input
              className="signup-input"
              type="password"
              placeholder="Confirm Password..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <select
              className="signup-role-select"
              value={roleID}
              onChange={(e) => setRoleID(Number(e.target.value))}
            >
              <option value={1}>Admin</option>
              <option value={2}>Foreman</option>
              <option value={3}>Worker</option>
            </select>

            {error && (
              <p className="signup-error-text" style={{ color: 'red' }}>
                {error}
              </p>
            )}
            
            {successMsg && (
              <p className="signup-success-text" style={{ color: 'green', fontWeight: 'bold' }}>
                {successMsg}
              </p>
            )}

            <p className="signup-login-text">
              I already have an Account,{" "}
              <span className="signup-link" onClick={onSwitchToLogin}>
                Log In
              </span>
            </p>

            <div className="signup-button-row">
              <button
                type="button"
                className="signup-cancel-btn"
                onClick={() => {
                  setFullName("");
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                  setError("");
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="signup-submit-btn"
                disabled={loading}
              >
                {loading ? "Loading..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="signup-right">
        <div className="signup-overlay" />
        <div className="signup-logo">
          <img src={Logo} alt="Projello" className="signup-logo-img" />
        </div>
        <div className="signup-circle" />
      </div>
    </div>
  );
}