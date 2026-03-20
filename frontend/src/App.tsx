import React from "react";
import { HashRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import DashboardPage from "./pages/dashboard/dashboard";
import LoginPage from "./pages/login/LoginPage";
import SignUpPage from "./pages/signup/SignupPage";
import ManagementPage from "./pages/management/management";
import SettingsPage from "./pages/settings/settings";
import SingleProjectViewPage from "./pages/single-view/single-project-view";

function LoginWrapper() {
  const navigate = useNavigate();
  return <LoginPage onSwitchToSignUp={() => navigate("/signup")} />;
}

function SignUpWrapper() {
  const navigate = useNavigate();
  return <SignUpPage onSwitchToLogin={() => navigate("/login")} />;
}

export default function App() {
  return (
    <HashRouter>
      <nav>
        <Link to="/dashboard">Dashboard</Link> |{" "}
        <Link to="/login">Login</Link> |{" "}
        <Link to="/signup">Sign Up</Link> |{" "}
        <Link to="/management">Management</Link> |{" "}
        <Link to="/settings">Settings</Link> |{" "}
        <Link to="/single-view">Single Project View</Link>
      </nav>
      <Routes>
        <Route path="/" element={<LoginWrapper />} />
        <Route path="/login" element={<LoginWrapper />} />
        <Route path="/signup" element={<SignUpWrapper />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/management" element={<ManagementPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/single-view" element={<SingleProjectViewPage />} />
      </Routes>
    </HashRouter>
  );
}