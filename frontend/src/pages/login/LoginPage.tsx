import React, { useState } from "react";
import Logo from "../../assets/Frame 106.svg";
import "./LoginPage.css";

interface LoginPageProps {
  onSwitchToSignUp: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToSignUp }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://localhost:5049/api/Auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError("Invalid email or password.");
        return;
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      alert(`Welcome back, ${data.user}!`);
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left - Form */}
      <div className="login-left">
        <div className="login-card">
          <h1 className="login-title">Log In</h1>

          <input
            className="login-input"
            type="email"
            placeholder="Email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="login-input"
            type="password"
            placeholder="Password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="login-error-text">
              {error}
            </p>
          )}

          <p className="login-signup-text">
            I don't have an Account,{" "}
            <span className="login-link" onClick={onSwitchToSignUp}>
              Sign Up
            </span>
          </p>

          <div className="login-button-row">
            <button
              className="login-cancel-btn"
              onClick={() => {
                setEmail("");
                setPassword("");
              }}
            >
              Cancel
            </button>
            <button
              className="login-submit-btn"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Loading..." : "Submit"}
            </button>
          </div>
        </div>
      </div>

      {/* Right - Photo */}
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
