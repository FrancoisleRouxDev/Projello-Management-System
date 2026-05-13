import React from "react";

// Temporary placeholder fallback for invalid project routes.
// Replace this with the shared app-level empty/error state component when available.

type SingleProjectNotFoundProps = {
  onBackToClients: () => void;
};

export default function SingleProjectNotFound({ onBackToClients }: SingleProjectNotFoundProps) {
  return (
    <div className="single-project-view">
      <section className="single-project-view__panel" aria-label="Project not found">
        <h2 className="single-project-view__panel-title">Project Not Available</h2>
        <p className="single-project-view__project-description">
          Open a client row from the management clients page to view a valid project.
        </p>
        <button type="button" className="single-project-view__view-all-button" onClick={onBackToClients}>
          Back To Clients
        </button>
      </section>
    </div>
  );
}
