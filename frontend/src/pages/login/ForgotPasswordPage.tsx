import React, { useState } from "react";
import Logo from "../../assets/Frame 160.svg";
import "./LoginPage.css";
import { API_BASE_URL } from "../../config";

interface ForgotPasswordPageProps {
  onSwitchToLogin: () => void;
}

export default function ForgotPasswordPage({ onSwitchToLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/Auth/request-password-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || data.message || "Password reset is temporarily unavailable.");
        return;
      }

      setSuccess(data.message);
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
          <h1 className="login-title">Reset Password</h1>
          <p className="login-signup-text">
            Enter your email and we&apos;ll send a reset link if an account exists.
          </p>
          <form onSubmit={submit}>
            <input
              className="login-input"
              type="email"
              placeholder="Email..."
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
            {error && <p className="login-error-text">{error}</p>}
            {success && <p className="login-success-text">{success}</p>}
            <div className="login-button-row">
              <button type="button" className="login-cancel-btn" onClick={onSwitchToLogin}>
                Back to Login
              </button>
              <button type="submit" className="login-submit-btn" disabled={loading}>
                {loading ? "Sending..." : "Send Link"}
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
