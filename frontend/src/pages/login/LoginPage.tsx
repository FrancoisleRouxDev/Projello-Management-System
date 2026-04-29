import React, { useState } from "react";
import Logo from "../../assets/Frame 106.svg";
import "./LoginPage.css";
import { useNavigate } from "react-router-dom";

// Import the Godzilla roar audio file for the success sound effect
const godzillaRoar = require("../../assets/zilla-1.mp3").default; 

// Define the expected properties: function to switch views and function to handle successful login
interface LoginPageProps {
  onSwitchToSignUp: () => void;
  onLoginSuccess: () => void;
}

export default function LoginPage({ onSwitchToSignUp, onLoginSuccess }: LoginPageProps) {
  // State for email input
  const [email, setEmail] = useState("");
  // State for password input
  const [password, setPassword] = useState("");
  // State to disable the submit button while the API call is in progress
  const [loading, setLoading] = useState(false);
  // State to store and display error messages from the server or network
  const [error, setError] = useState("");
  // State to store and display a temporary success message before redirect
  const [successMsg, setSuccessMsg] = useState("");
  
  // Initialize the router navigation hook for programmatic redirects
  const navigate = useNavigate();

  // Async function to handle the form submission event
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Stop the form from refreshing the page
    setLoading(true); // Enable loading state to disable the button
    setError(""); // Clear any previous errors
    setSuccessMsg(""); // Clear any previous success messages

    try {
      // Send POST request to the backend login API with email and password
      const response = await fetch("http://localhost:5049/api/Auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();

      // If the server returns an error status (e.g., 401), show the error message
      if (!response.ok) {
        setError(data.message || "Invalid email or password.");
        setLoading(false); // Re-enable the button
        return; // Stop execution of this function
      }

      // Check if the backend response indicates Two-Factor Authentication is required
      if (data.requires2FA) {
        // If 2FA is needed, redirect the user to the verification page
        // We pass the email in the navigation state so the 2FA page knows who to verify
        navigate("/verify-2fa", { state: { email: email } });
      } else {
        // If no 2FA is needed, proceed immediately with the standard login flow
        completeLogin(data.token);
      }
    } catch (err) {
      // Catch block handles network failures (e.g., server is offline)
      setError("Could not connect to server.");
      setLoading(false); // Re-enable the button
    }
  };

  // Function to finalize the login process after successful authentication
  const completeLogin = (token: string) => {
    // Save the authentication token to localStorage so the user stays logged in
    localStorage.setItem("token", token);
    
    setSuccessMsg("Login successful! Redirecting...");
    
    // Create an audio object and play the "Godzilla" roar sound effect
    const roar = new Audio(godzillaRoar);
    roar.play();
    
    // Wait 1 second to let the user see the success message and hear the sound, then trigger the parent's success handler
    setTimeout(() => {
      onLoginSuccess(); // This callback likely navigates away from this page or updates the app state
    }, 1000);
  };

  return (
    <div className="login-container">
      {/* Left column: Contains the actual login form */}
      <div className="login-left">
        <div className="login-card">
          <h1 className="login-title">Log In</h1>
          
          <form onSubmit={handleLoginSubmit}>
            {/* Email input field, controlled by React state */}
            <input
              className="login-input"
              type="email"
              placeholder="Email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            {/* Password input field, controlled by React state */}
            <input
              className="login-input"
              type="password"
              placeholder="Password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            {/* Conditionally render the error message if the error state is not empty */}
            {error && <p className="login-error-text" style={{ color: 'red' }}>{error}</p>}
            
            {/* Conditionally render the success message if the successMsg state is not empty */}
            {successMsg && <p className="login-success-text" style={{ color: 'green', fontWeight: 'bold' }}>{successMsg}</p>}
            
            {/* Text with a clickable link that triggers the parent's switch-to-signup function */}
            <p className="login-signup-text">
              I don't have an Account,{" "}
              <span className="login-link" onClick={onSwitchToSignUp}>
                Sign Up
              </span>
            </p>
            
            <div className="login-button-row">
              {/* Cancel button: clears all form inputs and error states without submitting */}
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
              
              {/* Submit button: disabled if loading is true to prevent double submissions */}
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

      {/* Right column: Decorative elements and branding */}
      <div className="login-right">
        <div className="login-overlay" />
        
        {/* Logo image that acts as a button to navigate to the dashboard */}
        <div className="login-logo">
          <img
            className="login-logo-img"
            src={Logo}
            alt="Projello Logo"
            style={{ cursor: "pointer" }}
            onClick={() => navigate("/dashboard")}
          />
        </div>
        
        {/* Decorative circle element (likely CSS styled) */}
        <div className="login-circle" />
      </div>
    </div>
  );
}