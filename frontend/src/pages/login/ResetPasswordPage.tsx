import React, { useMemo, useState } from "react";
import Logo from "../../assets/Frame 160.svg";
import "./LoginPage.css";
import { API_BASE_URL } from "../../config";
import { PasswordInput } from "../../components/PasswordInput";

interface ResetPasswordPageProps {
  onSwitchToLogin: () => void;
}

function getResetParameters() {
  const hashQuery = window.location.hash.split("?")[1] || "";
  const params = new URLSearchParams(hashQuery);
  return { email: params.get("email") || "", token: params.get("token") || "" };
}

export default function ResetPasswordPage({ onSwitchToLogin }: ResetPasswordPageProps) {
  const resetParameters = useMemo(getResetParameters, []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!resetParameters.email || !resetParameters.token) {
      setError("This password reset link is invalid or incomplete.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/Auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetParameters.email,
          token: resetParameters.token,
          newPassword: password,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "This password reset link is invalid or expired.");
        return;
      }

      setSuccess(data.message);
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-card">
          <h1 className="login-title">Choose a New Password</h1>
          <form onSubmit={submit}>
            <PasswordInput
              className="login-input"
              placeholder="New password..."
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="new-password"
            />
            <PasswordInput
              className="login-input"
              placeholder="Confirm password..."
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              autoComplete="new-password"
            />
            {error && <p className="login-error-text">{error}</p>}
            {success && <p className="login-success-text">{success}</p>}
            <div className="login-button-row">
              <button type="button" className="login-cancel-btn" onClick={onSwitchToLogin}>
                Back to Login
              </button>
              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? "Saving..." : "Set Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="login-right">
        <div className="login-overlay" />
        <div className="login-logo">
          <img className="login-logo-img" src={Logo} alt="Projello Logo" />
        </div>
        <div className="login-circle" />
      </div>
    </div>
  );
}
