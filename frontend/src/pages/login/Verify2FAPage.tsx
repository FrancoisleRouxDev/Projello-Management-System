import React, { useState } from "react";
// Import useNavigate for redirection and useLocation to read data passed from the previous page
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "../../assets/Frame 106.svg";
import "./LoginPage.css"; // Reusing your login styling to keep it consistent

const godzillaRoar = require("../../assets/zilla-1.mp3").default;

interface Verify2FAPageProps {
  onLoginSuccess: () => void;
}

export default function Verify2FAPage({ onLoginSuccess }: Verify2FAPageProps) {
  // State for the 6-digit verification code input
  const [code, setCode] = useState("");
  // State to display error messages if the code is invalid
  const [error, setError] = useState("");
  // State to manage the loading spinner/button state
  const [loading, setLoading] = useState(false);

  // Initialize navigation and location hooks
  const navigate = useNavigate();
  const location = useLocation();

  // Extract the email passed from LoginPage via route state
  // This ensures we only verify the specific user who requested 2FA
  const email = location.state?.email;

  // Security Check: If no email is found in state (e.g., user manually typed the URL), 
  // redirect them back to login and stop rendering this component
  if (!email) {
    navigate("/login");
    return null;
  }

  // Async function to handle the verification form submission
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page reload
    setLoading(true);
    setError("");

    try {
      // Send POST request to the backend to verify the 2FA code
      const response = await fetch("http://localhost:5049/api/Auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      
      const data = await response.json();

      if (response.ok) {
        // Success: Save the final JWT token to localStorage
        localStorage.setItem("token", data.token);
        
        // Play the "Godzilla" roar sound effect
        const roar = new Audio(godzillaRoar);
        roar.play();
        
        // Short delay for feedback, then trigger the parent's success handler to finish login
        setTimeout(() => {
          onLoginSuccess();
        }, 1000);
      } else {
        // Handle invalid code or server-side validation errors
        setError(data.message || "Invalid code. Please try again.");
      }
    } catch (err) {
      // Handle network failures (e.g., backend down)
      setError("Network error. Please try again.");
    } finally {
      // Always turn off loading state after the request completes (success or fail)
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Left column: Contains the 2FA verification form */}
      <div className="login-left">
        <div className="login-card">
          <h1 className="login-title" id="tfaHeading">Two-Step Verification</h1>
          
          <p style={{ color: "#aaa", marginBottom: "20px" }}>
            Enter the 6-digit code from your authenticator app.
          </p>
          
          <form onSubmit={handleVerify}>
            {/* Input field for the code, automatically strips non-numeric characters */}
            <input
              className="login-input"
              type="text"
              placeholder="000 000"
              value={code}
              // Regex /\D/g replaces any non-digit characters with empty string
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
              required
            />
            
            {/* Conditionally render error message if verification fails */}
            {error && <p className="login-error-text" style={{ color: "red" }}>{error}</p>}
            
            <div className="login-button-row" style={{ marginTop: "20px" }}>
              {/* Button to cancel 2FA and return to the main login page */}
              <button
                type="button"
                className="login-cancel-btn"
                onClick={() => navigate("/login")}
              >
                Back to Login
              </button>
              
              {/* Submit button disabled if loading OR if code is less than 6 digits */}
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

      {/* Right column: Decorative elements and branding (matches LoginPage) */}
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