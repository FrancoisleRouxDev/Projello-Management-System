import React, { useState } from "react";
import Logo from "../../assets/Frame 106.svg";
import "./SignupPage.css";

// Define the prop interface: expects a function to switch back to the login view
interface SignUpPageProps {
  onSwitchToLogin: () => void;
}

// Export as a standard function to prevent TypeScript errors
export default function SignUpPage({ onSwitchToLogin }: SignUpPageProps) {
  // State for Full Name input
  const [fullName, setFullName] = useState("");
  // State for Email input
  const [email, setEmail] = useState("");
  // State for Password input
  const [password, setPassword] = useState("");
  // State for Confirm Password input
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Default role is set to 3 (Worker)
  const [roleID, setRoleID] = useState(3);
  
  // State for loading spinner/button
  const [loading, setLoading] = useState(false);
  // State for error messages
  const [error, setError] = useState("");
  // State for success message
  const [successMsg, setSuccessMsg] = useState("");

  // Async function to handle the registration form submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page reload
    setError("");
    setSuccessMsg("");

    // Client-side validation: Check if passwords match before sending to server
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true); // Disable button while processing

    try {
      // Send POST request to the backend registration API
      const response = await fetch("http://localhost:5049/api/Auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, roleID }),
      });

      // If the response status is not OK (e.g., 400, 500)
      if (!response.ok) {
        let errorMessage = "Registration failed. Please check your information.";
        
        try {
          // Attempt to parse the JSON error response from the server
          const data = await response.json();
          
          // Handle different error response formats from the backend
          if (Array.isArray(data) && data[0]?.description) {
            errorMessage = data[0].description;
          } else if (data.errors) {
            // Handle validation errors (e.g., duplicate email)
            const firstErrorKey = Object.keys(data.errors)[0];
            errorMessage = data.errors[firstErrorKey][0];
          } else if (typeof data === "string") {
            errorMessage = data;
          } else if (data.message) {
            errorMessage = data.message;
          }
        } catch (jsonError) {
          // Fallback if the server sends a raw HTML error page (e.g., 500 crash)
          if (response.status === 500) {
            errorMessage = "Internal Server Error (500). The database or backend crashed.";
          }
        }
        
        // Display the parsed error message
        setError(errorMessage);
        setLoading(false);
        return; // Stop execution
      }

      // Success case: Show success message and redirect after a delay
      setSuccessMsg("Registration successful! Redirecting to login...");
      setTimeout(() => {
        onSwitchToLogin();
      }, 1500);

    } catch (err) {
      // Handle network failures (e.g., CORS issues, server down)
      setError("Could not connect to server. Is the API running?");
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      {/* Left column: Contains the registration form */}
      <div className="signup-left">
        <div className="signup-card">
          <h1 className="signup-title">Sign Up</h1>
          
          <form onSubmit={handleRegister}>
            {/* Full Name input field */}
            <input
              className="signup-input"
              type="text"
              placeholder="Full Name..."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            
            {/* Email input field */}
            <input
              className="signup-input"
              type="email"
              placeholder="Email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            {/* Password input field */}
            <input
              className="signup-input"
              type="password"
              placeholder="Password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            {/* Confirm Password input field */}
            <input
              className="signup-input"
              type="password"
              placeholder="Confirm Password..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            
            {/* Role selection dropdown */}
            <select
              className="signup-role-select"
              value={roleID}
              onChange={(e) => setRoleID(Number(e.target.value))}
            >
              <option value={1}>Admin</option>
              <option value={2}>Foreman</option>
              <option value={3}>Worker</option>
            </select>
            
            {/* Conditionally render error message */}
            {error && (
              <p className="signup-error-text" style={{ color: 'red' }}>
                {error}
              </p>
            )}
            
            {/* Conditionally render success message */}
            {successMsg && (
              <p className="signup-success-text" style={{ color: 'green', fontWeight: 'bold' }}>
                {successMsg}
              </p>
            )}
            
            {/* Link to switch back to the login page */}
            <p className="signup-login-text">
              I already have an Account,{" "}
              <span className="signup-link" onClick={onSwitchToLogin}>
                Log In
              </span>
            </p>
            
            <div className="signup-button-row">
              {/* Cancel button: clears all form inputs and error states without submitting */}
              <button
                type="button"
                className="signup-cancel-btn"
                onClick={() => {
                  setFullName("");
                  setEmail("");
                  setPassword("");
                  setConfirmPassword("");
                  setError("");
                }}
              >
                Cancel
              </button>
              
              {/* Submit button: disabled if loading is true */}
              <button
                type="submit"
                className="signup-submit-btn"
                disabled={loading}
              >
                {loading ? "Loading..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right column: Decorative elements and branding */}
      <div className="signup-right">
        <div className="signup-overlay" />
        <div className="signup-logo">
          <img src={Logo} alt="Projello" className="signup-logo-img" />
        </div>
        <div className="signup-circle" />
      </div>
    </div>
  );
}