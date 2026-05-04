import React from "react";
import { ProjectViewData } from "./SingleProjectViewTypes";

// Temporary placeholder presentation component.
// Keep this as a UI shell and replace static sections/tabs with real feature components as they are built.

type SingleProjectViewTemplateProps = {
  project: ProjectViewData;
  onBackToClients: () => void;
};

export default function SingleProjectViewTemplate({ project, onBackToClients }: SingleProjectViewTemplateProps) {
  return (
    <div className="single-project-view">
      <header className="single-project-view__header">
        <div className="single-project-view__breadcrumb-row">
          <button type="button" className="single-project-view__back-button" aria-label="Go back" onClick={onBackToClients}>
            ←
          </button>

          <h1 className="single-project-view__project-name">{project.projectName}</h1>
          <span className="single-project-view__separator">/</span>
          <span className="single-project-view__client-name">{project.clientName}</span>
          <span className="single-project-view__completion-pill">{project.completion}% Complete</span>
        </div>

        <div className="single-project-view__tabs">
          <button type="button" className="single-project-view__tab single-project-view__tab--active">
            Overview
          </button>
          <button type="button" className="single-project-view__tab">Discussion 4</button>
          <button type="button" className="single-project-view__tab">Gallery 0</button>
        </div>
      </header>

      <section className="single-project-view__stats" aria-label="Project statistics">
        {project.stats.map((stat) => (
          <article key={stat.label} className="single-project-view__stat-card">
            <div className="single-project-view__stat-label">{stat.label}</div>
            <div className="single-project-view__stat-value">{stat.value}</div>
          </article>
        ))}
      </section>

      <section className="single-project-view__main-grid" aria-label="Project overview content">
        <article className="single-project-view__panel">
          <h2 className="single-project-view__panel-title">Project Information</h2>
          <p className="single-project-view__project-description">{project.projectDescription}</p>
        </article>

        <article className="single-project-view__panel">
          <h2 className="single-project-view__panel-title">Progress Breakdown</h2>

          <div className="single-project-view__progress-list">
            {project.progressBreakdown.map((item) => (
              <div key={item.label} className="single-project-view__progress-item">
                <div className="single-project-view__progress-meta">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="single-project-view__progress-track" aria-hidden="true">
                  <div className="single-project-view__progress-fill" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="single-project-view__panel" aria-label="Recent site photos">
        <div className="single-project-view__panel-header-row">
          <h2 className="single-project-view__panel-title">Recent Site Photos</h2>
          <button type="button" className="single-project-view__view-all-button">
            View All
          </button>
        </div>

        <div className="single-project-view__photo-grid">
          {project.photoTiles.map((tile) => (
            <div key={tile} className="single-project-view__photo-tile" aria-label="Project site photo placeholder" />
          ))}
        </div>
      </section>
    </div>
  );
}
