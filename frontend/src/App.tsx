import React from "react";
import { HashRouter, Routes, Route, useNavigate } from "react-router-dom"; // ← remove Link
import DashboardPage from "./pages/dashboard/dashboard";
import LoginPage from "./pages/login/LoginPage";
import SignUpPage from "./pages/signup/SignupPage";
import ManagementPage from "./pages/management/management";
import SettingsPage from "./pages/settings/settings";
import SingleProjectViewPage from "./pages/single-view/single-project-view";

function LoginWrapper() {
  const navigate = useNavigate();
  return (
    <LoginPage
      key="login"
      onSwitchToSignUp={() => navigate("/signup")}
      onLoginSuccess={() => navigate("/dashboard")}
    />
  );
}

function SignUpWrapper() {
  const navigate = useNavigate();
  return <SignUpPage key="signup" onSwitchToLogin={() => navigate("/login")} />;
}

export default function App() {
  return (
    <HashRouter>
      {/* ← remove the entire <nav> block, it sits on top of your pages */}
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