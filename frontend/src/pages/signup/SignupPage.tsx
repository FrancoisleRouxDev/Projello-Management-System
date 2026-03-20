import React, { useState } from "react";
import Logo from "../../assets/Frame 106.svg";
import "./SignupPage.css";

interface SignUpPageProps {
  onSwitchToLogin: () => void;
}

const SignUpPage: React.FC<SignUpPageProps> = ({ onSwitchToLogin }) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [roleID, setRoleID] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");

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
        const data = await response.json();
        setError(data[0]?.description || "Registration failed.");
        return;
      }

      alert("Account created! Please log in.");
      onSwitchToLogin();
    } catch {
      setError("Could not connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      {/* Left - Form */}
      <div className="signup-left">
        <div className="signup-card">
          <h1 className="signup-title">Sign Up</h1>

          <input
            className="signup-input"
            type="text"
            placeholder="Full Name..."
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            className="signup-input"
            type="email"
            placeholder="Email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="signup-input"
            type="password"
            placeholder="Password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            className="signup-input"
            type="password"
            placeholder="Confirm Password..."
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            <p className="signup-error-text">
              {error}
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
              className="signup-cancel-btn"
              onClick={() => {
                setFullName("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
              }}
            >
              Cancel
            </button>
            <button
              className="signup-submit-btn"
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? "Loading..." : "Submit"}
            </button>
          </div>
        </div>
      </div>

      {/* Right - Photo */}
      <div className="signup-right">
        <div className="signup-overlay" />
        <div className="signup-logo">
          <img src={Logo} alt="Projello" className="signup-logo-img" />
        </div>
        <div className="signup-circle" />
      </div>
    </div>
  );
};

export default SignUpPage;
