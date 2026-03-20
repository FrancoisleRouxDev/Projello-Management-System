import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import DashboardPage from "./pages/dashboard/dashboard";
import LoginPage from "./pages/login/login";
import ManagementPage from "./pages/management/management";
import SettingsPage from "./pages/settings/settings";
import SingleProjectViewPage from "./pages/single-view/single-project-view";

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/dashboard">Dashboard</Link> |{" "}
        <Link to="/login">Login</Link> |{" "}
        <Link to="/management">Management</Link> |{" "}
        <Link to="/settings">Settings</Link> |{" "}
        <Link to="/single-view">Single Project View</Link>
      </nav>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/management" element={<ManagementPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/single-view" element={<SingleProjectViewPage />} />
      </Routes>
    </BrowserRouter>
  );
}