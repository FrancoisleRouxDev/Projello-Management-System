import React, { useState } from "react";
import Logo from "../../assets/Frame 106.svg";
import "./LoginPage.css";
import { useNavigate } from "react-router-dom";

const godzillaRoar = require("../../assets/zilla-1.mp3").default; // Importing the Godzilla roar sound

interface LoginPageProps {
  onSwitchToSignUp: () => void;
  onLoginSuccess: () => void;
}

export default function LoginPage({ onSwitchToSignUp, onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch("http://localhost:5049/api/Auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid email or password.");
        setLoading(false);
        return;
      }

      // --- NEW 2FA ROUTING LOGIC ---
      if (data.requires2FA) {
        // Navigate to the new 2FA page and securely pass the email in the route state
        navigate("/verify-2fa", { state: { email: email } });
      } else {
        completeLogin(data.token);
      }
    } catch {
      setError("Could not connect to server.");
      setLoading(false);
    }
  };

  const completeLogin = (token: string) => {
    localStorage.setItem("token", token);
    
    setSuccessMsg("Login successful! Redirecting...");
    
    // 🦎 Godzilla approves
    const roar = new Audio(godzillaRoar);
    roar.play();

    setTimeout(() => {
      onLoginSuccess();
    }, 1000);
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-card">
          <h1 className="login-title">Log In</h1>

          <form onSubmit={handleLoginSubmit}>
            <input
              className="login-input"
              type="email"
              placeholder="Email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              className="login-input"
              type="password"
              placeholder="Password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="login-error-text" style={{ color: 'red' }}>{error}</p>}
            {successMsg && <p className="login-success-text" style={{ color: 'green', fontWeight: 'bold' }}>{successMsg}</p>}

            <p className="login-signup-text">
              I don't have an Account,{" "}
              <span className="login-link" onClick={onSwitchToSignUp}>
                Sign Up
              </span>
            </p>

            <div className="login-button-row">
              <button
                type="button"
                className="login-cancel-btn"
                onClick={() => {
                  setEmail("");
                  setPassword("");
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
                {loading ? "Loading..." : "Submit"}
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