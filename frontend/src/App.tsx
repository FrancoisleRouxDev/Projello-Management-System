import React from "react";
import { HashRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import DashboardPage from "./pages/dashboard/dashboard";
import LoginPage from "./pages/login/LoginPage";
import SignUpPage from "./pages/signup/SignupPage";
import Verify2FAPage from "./pages/login/Verify2FAPage"; // Make sure this path matches where you saved it!
import ManagementPage from "./pages/management/management";
import SettingsPage from "./pages/settings/settings";
import SingleProjectViewPage from "./pages/single-view/single-project-view";
import HistoryPage from "./pages/history/history";
import SideNavBar from "./components/SideNavBar";
import BodyBlock from "./components/BodyBlock";
import SplashPage from "./pages/splash/SplashPage";

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

// --- NEW WRAPPER FOR 2FA ---
function Verify2FAWrapper() {
  const navigate = useNavigate();
  return <Verify2FAPage key="verify-2fa" onLoginSuccess={() => navigate("/dashboard")} />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  // Added "/verify-2fa" to the array so the sidebar is hidden on this page too
  const hideNav = ["/", "/login", "/signup", "/verify-2fa"].includes(location.pathname);
  
  return (
    <div style={{ display: "flex" }}>
      {!hideNav && <SideNavBar />}
      <div style={{ flex: 1, marginLeft: !hideNav ? 225 : 0 }}>
        {!hideNav ? (
          <BodyBlock>
            {children}
          </BodyBlock>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<SplashPage />} />
          <Route path="/login" element={<LoginWrapper />} />
          <Route path="/signup" element={<SignUpWrapper />} />
          
          {/* NEW 2FA ROUTE */}
          <Route path="/verify-2fa" element={<Verify2FAWrapper />} />
          
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/management" element={<ManagementPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/single-view/:clientId" element={<SingleProjectViewPage />} />
        </Routes>
      </AppLayout>
    </HashRouter>
  );
}