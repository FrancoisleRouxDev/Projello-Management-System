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
    <nav className="management-top-nav" aria-label="Management navigation">
      <div className="management-top-nav__tabs-container">
        <button
          className={`management-top-nav__tab-button ${activeView === "projects" ? "management-top-nav__tab-button--active" : ""}`}
          onClick={() => onViewChange("projects")}
          type="button"
          aria-current={activeView === "projects" ? "page" : undefined}
        >
          Projects
        </button>
        <button
          className={`management-top-nav__tab-button ${activeView === "clients" ? "management-top-nav__tab-button--active" : ""}`}
          onClick={() => onViewChange("clients")}
          type="button"
          aria-current={activeView === "clients" ? "page" : undefined}
        >
          Clients
        </button>
        <button
          className={`management-top-nav__tab-button ${activeView === "workers" ? "management-top-nav__tab-button--active" : ""}`}
          onClick={() => onViewChange("workers")}
          type="button"
          aria-current={activeView === "workers" ? "page" : undefined}
        >
          Workers
        </button>
      </div>
    </nav>
  );
}
