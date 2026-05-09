import React from "react";
import "./StatCard.css";

type StatCardProps = {
  value: string;
  label: string;
  icon?: React.ReactNode;
  tone?: "success" | "warning" | "danger" | "neutral";
  className?: string;
};

// Reusable metric tile for dashboard and management summary sections.
// Use this by importing StatCard, then pass the display value, label, and an optional icon/tone.
// Example:
// <StatCard
//   value="R400k"
//   label="Total Revenue"
//   tone="success"
//   icon={<RevenueIcon />}
// />
// Keep the content data-driven so the same card can render revenue, counts, or status totals.
export default function StatCard({ value, label, icon, tone = "success", className = "" }: StatCardProps) {
  return (
    <article className={`stat-card ${tone ? `stat-card--${tone}` : ""} ${className}`.trim()}>
      <div className="stat-card__header">
        <div className="stat-card__icon" aria-hidden="true">
          {icon}
        </div>
      </div>

      <div className="stat-card__body">
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
      </div>
    </article>
  );
}