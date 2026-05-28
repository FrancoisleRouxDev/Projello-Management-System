import React, { useState } from "react";
import Logo from "../../assets/Frame 160.svg";
import "../login/LoginPage.css";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

interface SignUpPageProps {
  onSwitchToLogin: () => void;
}

export default function SignUpPage({ onSwitchToLogin }: SignUpPageProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(""); // ← NEW
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        fullName,
        email,
        password,
      };

      // Only include inviteCode if user entered one
      if (inviteCode.trim()) {
        payload.inviteCode = inviteCode.trim();
      }

      const response = await fetch(`${API_BASE_URL}/api/Auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || "Failed to create account.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        onSwitchToLogin();
      }, 1500);
    } catch (err) {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-card">
          <h1 className="login-title">Create Account</h1>

          <form onSubmit={handleSignUp}>
            <input
              className="login-input"
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <input
              className="login-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              className="login-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <input
              className="login-input"
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {/* Invite Code Field */}
            <input
              className="login-input"
              type="text"
              placeholder="Invite Code (optional)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />

            {error && <p style={{ color: "red" }}>{error}</p>}
            {successMsg && <p style={{ color: "green", fontWeight: "bold" }}>{successMsg}</p>}

            <div className="signinText">
            <p className="login-signup-text">
              Already have an account?{" "}
              <span className="login-link" onClick={onSwitchToLogin}>
                Log In
              </span>
            </p>
            </div>

            <div className="login-button-row">
              <button
                type="button"
                className="login-cancel-btn"
                onClick={() => {
                  setFullName("");
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                  setInviteCode("");
                  setError("");
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? "Creating..." : "Sign Up"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="login-right">
        <div className="login-overlay" />
        <div className="login-logo">
          <img
            className="login-logo-img"
            src={Logo}
            alt="Projello Logo"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/dashboard")}
          />
        </div>
        <div className="login-circle" />
      </div>
    </div>
  );
}