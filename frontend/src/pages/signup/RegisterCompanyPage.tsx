import React, { useState } from "react";
import Logo from "../../assets/Frame 160.svg";
import "./SignupPage.css";
import { API_BASE_URL } from "../../config";

interface RegisterCompanyPageProps {
  onSwitchToLogin: () => void;
}

export default function RegisterCompanyPage({ onSwitchToLogin }: RegisterCompanyPageProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/Auth/register-company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          roleID: 4,
          companyName,
        }),
      });

      if (!response.ok) {
        setError("Failed to register company. Please try again.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Company registered successfully! Redirecting...");
      setTimeout(() => {
        onSwitchToLogin();
      }, 1500);

    } catch (err) {
      setError("Could not connect to server.");
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-left">
        <div className="signup-card">
          <h1 className="signup-title">Register Company</h1>

          <form onSubmit={handleRegisterCompany}>

            {/* This is the new location for the owner tag for the moment */}
            <div style={{marginBottom: 12 }}>
              <select className="signup-role-select" value={4} disabled style={{ width: 160, cursor: "not-allowed" }}>
                <option value={4}>Owner</option>
              </select>

            </div>
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

            <input
              className="signup-input"
              type="text"
              placeholder="Company Name..."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />


             {/* Commenting this out for the time being since its hardcoded.
             1st change suggestion form William */}
            {/* <select className="signup-role-select" value={4} disabled>
              <option value={4}>Owner</option>
            </select> */}

            {error && <p className="signup-error-text" style={{ color: 'red' }}>{error}</p>}
            {successMsg && (
              <p className="signup-success-text" style={{ color: 'green', fontWeight: 'bold' }}>
                {successMsg}
              </p>
            )}
            
            <div className="signinText">
            <p className="signup-login-text">
              Already have an account?{" "}
              <span className="signup-link" onClick={onSwitchToLogin}>
                Log In
              </span>
            </p>
            </div>

            <div className="signup-button-row">
              <button
                type="button"
                className="signup-cancel-btn"
                onClick={() => {
                  setFullName("");
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                  setCompanyName("");
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" className="signup-submit-btn" disabled={loading}>
                {loading ? "Creating..." : "Create Company"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}