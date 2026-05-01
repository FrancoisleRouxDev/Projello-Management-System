import React from "react";
import "./ManagementTopNav.css";

export type ManagementTab = {
  id: string;
  label: string;
};

type ManagementTopNavProps = {
  tabs: ManagementTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  fullBleed?: boolean;
};

// Controlled tab switcher for the management pages.
// The page owns the active tab state; this component only renders the tabs and emits changes.
export default function ManagementTopNav({ tabs, activeTab, onTabChange, className = "", fullBleed = false }: ManagementTopNavProps) {
  return (
    <nav
      className={`management-top-nav ${fullBleed ? "management-top-nav--full-bleed" : ""} ${className}`.trim()}
      aria-label="Management sections"
    >
      <div className="management-top-nav__tabs">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              className={`management-top-nav__tab ${isActive ? "management-top-nav__tab--active" : ""}`.trim()}
              onClick={() => onTabChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="management-top-nav__label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}