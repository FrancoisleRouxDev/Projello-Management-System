import React, { useState } from "react";
import Logo from "../../assets/Frame 106.svg";
import "./LoginPage.css";
import { useNavigate } from "react-router-dom";
import Verify2FA from "./Verify2FA"; // Make sure this import is here

const godzillaRoar = require("../../assets/zilla-1.mp3");

interface LoginPageProps {
  onSwitchToSignUp: () => void;
  onLoginSuccess: () => void;
}

// Exported as a standard function to prevent TS2786 errors
export default function LoginPage({ onSwitchToSignUp, onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);

const handleLogin = async () => {
  setLoading(true);// Shows loading spinner
  setError("");// Clears previous errors
  try {
    const response = await fetch("http://localhost:5049/api/Auth/login", {// Calls backend API
      method: "POST",
      headers: { "Content-Type": "application/json" },// Sends JSON
      body: JSON.stringify({ email, password }),// Serializes form data
    });

    if (!response.ok) {// Checks HTTP status
      setError("Invalid email or password.");// User-friendly error
      return;
    }
  };

    const data = await response.json();// Parses JSON response
    localStorage.setItem("token", data.token);// Stores JWT for persistence

    // 🦎 Godzilla approves
    const roar = new Audio(godzillaRoar);
    roar.play();

    onLoginSuccess();// Navigates to app
  } catch {
    setError("Could not connect to server.");// Network error
  } finally {
    setLoading(false);// Hides spinner
  }

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-card">
          <h1 className="login-title">Log In</h1>

          {/* Form wrapper allows the "Enter" key to submit the data */}
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