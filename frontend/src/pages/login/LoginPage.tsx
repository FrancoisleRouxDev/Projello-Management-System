import React, { useState } from "react";
import Logo from "../../assets/Frame 106.svg";
import "./LoginPage.css";
import Verify2FA from "./Verify2FA"; // Importing new 2FA component
const godzillaRoar = require("../../assets/zilla-1.mp3");

interface LoginPageProps {
  onSwitchToSignUp: () => void;
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToSignUp, onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState(""); // State for success message
  const [requires2FA, setRequires2FA] = useState(false); // State to trigger 2FA view

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents page reload on 'Enter' key submit
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

      // Check if the backend is asking for 2FA verification
      if (data.requires2FA) {
        setRequires2FA(true);
        setLoading(false);
      } else {
        // Normal login flow
        completeLogin(data.token);
      }
    } catch {
      setError("Could not connect to server.");
      setLoading(false);
    }
  };

  // Helper function to finish the login process so Verify2FA can also call it
  const completeLogin = (token: string) => {
    localStorage.setItem("token", token);
    
    // Show in-UI success message instead of an alert
    setSuccessMsg("Login successful! Redirecting...");
    
    // 🦎 Godzilla approves
    const roar = new Audio(godzillaRoar);
    roar.play();

    // Give a 1-second delay so the user can see the message and hear the roar
    setTimeout(() => {
      onLoginSuccess();
    }, 1000);
  };

  // If 2FA is required, render the Verify2FA component instead of the login form
  if (requires2FA) {
    return (
      <Verify2FA 
        email={email} 
        onVerificationSuccess={(token) => completeLogin(token)} 
        onCancel={() => setRequires2FA(false)} 
      />
    );
  }

  // Otherwise, render the normal Login Form
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
                type="button" // Type "button" prevents it from triggering form submit
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
                type="submit" // Type "submit" triggers the form's onSubmit event
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
          <img src={Logo} alt="Projello" className="login-logo-img" />
        </div>
        <div className="login-circle" />
      </div>
    </div>
  );
};

export default LoginPage;