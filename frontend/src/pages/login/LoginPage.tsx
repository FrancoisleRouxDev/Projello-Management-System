import React, { useState } from "react";
import Logo from "../../assets/Frame 106.svg";
import "./LoginPage.css";
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

    // 🦎 Godzilla approves
    const roar = new Audio(godzillaRoar);
    roar.play();

    onLoginSuccess();
  } catch {
    setError("Could not connect to server.");
  } finally {
    setLoading(false);
  }
};
//nice to have, if we can just hit the enter button to log in, instead of having to click the submit button
// need a new way to show a success message, instead of an alert so we dont have that wierd bug again , applies the same with sign up.
  return (
    <div className="login-container">
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

          {error && <p className="login-error-text">{error}</p>}

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