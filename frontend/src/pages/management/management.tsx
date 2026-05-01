import React, { useState } from "react";
import "./management.css";
import ManagementTopNav from "../../components/ManagementTopNav";
import ClientsPage from "./Clients";
import WorkersPage from "./Workers";

type ManagementTabId = "clients" | "workers";

export default function ManagementPage() {
  const [activeTab, setActiveTab] = useState<ManagementTabId>("clients");

  const tabs = [
    { id: "clients", label: "Clients" },
    { id: "workers", label: "Workers" },
  ];

  return (
    <div className="management-page">
      {/* Top tab switcher for the two management screens */}
      <ManagementTopNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as ManagementTabId)}
      />

      {/* Render the selected management page */}
      <div className="management-page__content">
        {activeTab === "clients" && <ClientsPage />}
        {activeTab === "workers" && <WorkersPage />}
      </div>
    </div>
  );
}