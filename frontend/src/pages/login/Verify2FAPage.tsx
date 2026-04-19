import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "../../assets/Frame 106.svg";
import "./LoginPage.css"; // Reusing your login styling to keep it consistent

const godzillaRoar = require("../../assets/zilla-1.mp3").default;

interface Verify2FAPageProps {
  onLoginSuccess: () => void;
}

export default function Verify2FAPage({ onLoginSuccess }: Verify2FAPageProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Grab the email we passed in the state from LoginPage
  const email = location.state?.email;

  // If someone tries to manually type /verify-2fa in the URL without logging in first, kick them back
  if (!email) {
    navigate("/login");
    return null;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5049/api/Auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success! Save the real JWT token
        localStorage.setItem("token", data.token);

        // 🦎 Godzilla approves
        const roar = new Audio(godzillaRoar);
        roar.play();

        // Redirect to Dashboard
        setTimeout(() => {
          onLoginSuccess();
        }, 1000);
      } else {
        setError(data.message || "Invalid code. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-card">
          <h1 className="login-title">Two-Step Verification</h1>
          <p style={{ color: "#aaa", marginBottom: "20px" }}>
            Enter the 6-digit code from your authenticator app.
          </p>

          <form onSubmit={handleVerify}>
            <input
              className="login-input"
              type="text"
              placeholder="000 000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
              required
            />

            {error && <p className="login-error-text" style={{ color: "red" }}>{error}</p>}

            <div className="login-button-row" style={{ marginTop: "20px" }}>
              <button
                type="button"
                className="login-cancel-btn"
                onClick={() => navigate("/login")}
              >
                Back to Login
              </button>
              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading || code.length < 6}
              >
                {loading ? "Verifying..." : "Verify Code"}
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