import React, { useState } from "react";
import Logo from "../../assets/Frame 106.svg";

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    backgroundColor: "#283332",
    fontFamily: "'Segoe UI', sans-serif",
    overflow: "hidden",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  left: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
    minWidth: "50%",
    boxSizing: "border-box",
  },
  card: {
    backgroundColor: "#f0f0ec",
    borderRadius: "32px",
    padding: "48px 40px",
    width: "100%",
    maxWidth: "420px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  title: {
    fontSize: "36px",
    fontWeight: "800",
    color: "#1a2420",
    textAlign: "center",
    marginBottom: "8px",
  },
  input: {
    backgroundColor: "#e0e0da",
    border: "none",
    borderRadius: "50px",
    padding: "16px 24px",
    fontSize: "15px",
    color: "#444",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  loginText: {
    textAlign: "center",
    fontSize: "13px",
    color: "#666",
  },
  link: {
    color: "#c8a84b",
    cursor: "pointer",
    textDecoration: "none",
    fontWeight: "600",
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    marginTop: "8px",
  },
  cancelBtn: {
    flex: 1,
    padding: "14px",
    borderRadius: "50px",
    border: "none",
    backgroundColor: "#a6ab8d",
    color: "#fff",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
  },
  submitBtn: {
    flex: 1,
    padding: "14px",
    borderRadius: "50px",
    border: "none",
    backgroundColor: "#4a5e4a",
    color: "#fff",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
  },
  right: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
    minWidth: "50%",
    backgroundImage:
      "url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800')",
    backgroundSize: "cover",
    backgroundPosition: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  logo: {
    position: "absolute",
    top: "32px",
    right: "32px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    zIndex: 2,
  },
  logoText: {
    fontSize: "36px",
    fontWeight: "800",
    color: "#fff",
    letterSpacing: "-1px",
  },
  circle: {
    position: "absolute",
    bottom: "-80px",
    left: "-80px",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    backgroundColor: "rgba(255,255,255,0.05)",
    zIndex: 2,
  },
  roleSelect: {
    backgroundColor: "#e0e0da",
    border: "none",
    borderRadius: "50px",
    padding: "16px 24px",
    fontSize: "15px",
    color: "#444",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    appearance: "none",
    cursor: "pointer",
  },
};

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
    <div style={styles.container}>
      {/* Left - Form */}
      <div style={styles.left}>
        <div style={styles.card}>
          <h1 style={styles.title}>Sign Up</h1>

          <input
            style={styles.input}
            type="text"
            placeholder="Full Name..."
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <input
            style={styles.input}
            type="email"
            placeholder="Email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            style={styles.input}
            type="password"
            placeholder="Confirm Password..."
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <select
            style={styles.roleSelect}
            value={roleID}
            onChange={(e) => setRoleID(Number(e.target.value))}
          >
            <option value={1}>Admin</option>
            <option value={2}>Foreman</option>
            <option value={3}>Worker</option>
          </select>

          {error && (
            <p style={{ color: "red", textAlign: "center", fontSize: "13px" }}>
              {error}
            </p>
          )}

          <p style={styles.loginText}>
            I already have an Account,{" "}
            <span style={styles.link} onClick={onSwitchToLogin}>
              Log In
            </span>
          </p>

          <div style={styles.buttonRow}>
            <button
              style={styles.cancelBtn}
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
              style={styles.submitBtn}
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? "Loading..." : "Submit"}
            </button>
          </div>
        </div>
      </div>

      {/* Right - Photo */}
      <div style={styles.right}>
        <div style={styles.overlay} />
        <div style={styles.logo}>
 <img src={require("../../assets/Frame 106.svg")} alt="Projello" style={{ height: "60px" }} />
</div>
        <div style={styles.circle} />
      </div>
    </div>
  );
};

export default SignUpPage;
