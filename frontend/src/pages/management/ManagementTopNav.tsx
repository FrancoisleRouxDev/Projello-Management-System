import React from "react";
import "./ManagementTopNav.css";

// NOTE: "clients" view type is included but currently disabled - see management.tsx for context
type ManagementView = "projects" | "clients" | "workers";

interface ManagementTopNavProps {
  activeView: ManagementView;
  onViewChange: (view: ManagementView) => void;
}

export default function ManagementTopNav({ activeView, onViewChange }: ManagementTopNavProps) {
  return (
    <nav className="management-top-nav">
      <div className="management-top-nav__tabs">
        <button
          className={`management-top-nav__tab ${activeView === "projects" ? "management-top-nav__tab--active" : ""}`}
          onClick={() => onViewChange("projects")}
        >
          Projects
        </button>
        {/* CLIENTS TAB - Currently disabled in management.tsx (see TODO in management.tsx regarding Clients.tsx architecture) */}
        <button
          className={`management-top-nav__tab ${activeView === "clients" ? "management-top-nav__tab--active" : ""}`}
          onClick={() => onViewChange("clients")}
        >
          Clients
        </button>
        <button
          className={`management-top-nav__tab ${activeView === "workers" ? "management-top-nav__tab--active" : ""}`}
          onClick={() => onViewChange("workers")}
        >
          Workers
        </button>
      </div>
    </nav>
  );
}
