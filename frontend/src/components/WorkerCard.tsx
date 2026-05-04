import React from "react";
import "./WorkerCard.css";

export type WorkerCardTone = "success" | "warning" | "neutral";

export type WorkerCardProps = {
  initials: string;
  name: string;
  email: string;
  role: string;
  assignedTo: string;
  status: string;
  statusTone?: WorkerCardTone;
  className?: string;
};

// Reusable worker summary card for the management > workers screen.
// Pass the worker details as props so the same card can render any team member.
// Example:
// <WorkerCard
//   initials="AR"
//   name="Alex Rivera"
//   email="alex@projello.io"
//   role="Lead Developer"
//   assignedTo="Aurora"
//   status="Active"
//   statusTone="success"
// />
export default function WorkerCard({
  initials,
  name,
  email,
  role,
  assignedTo,
  status,
  statusTone = "neutral",
  className = "",
}: WorkerCardProps) {
  return (
    <article className={`worker-card worker-card--${statusTone} ${className}`.trim()} aria-label={`${name} worker card`}>
      <div className="worker-card__header">
        <div className="worker-card__identity">
          <div className="worker-card__avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="worker-card__identity-copy">
            <div className="worker-card__name">{name}</div>
            <div className="worker-card__email">
              <span className="worker-card__email-icon" aria-hidden="true">@</span>
              <span>{email}</span>
            </div>
          </div>
        </div>

        <span className="worker-card__status">
          <span className="worker-card__status-dot" aria-hidden="true" />
          {status}
        </span>
      </div>

      <div className="worker-card__body">
        <div className="worker-card__role-pill">{role}</div>

        <div className="worker-card__assignment">
          <div className="worker-card__assignment-label">Assigned to</div>
          <div className="worker-card__assignment-value">{assignedTo}</div>
        </div>
      </div>
    </article>
  );
}
