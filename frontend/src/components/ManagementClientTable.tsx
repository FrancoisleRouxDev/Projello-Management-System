import React from "react";
import "./ManagementClientTable.css";

export type ManagementClientRow = {
  clientId: string;
  initials: string;
  name: string;
  company: string;
  totalPaid: string;
  outstanding: string;
  projects: string;
  activeProjects: string;
  status: string;
  statusTone?: "success" | "warning" | "danger" | "neutral";
};

type ManagementClientTableProps = {
  rows: ManagementClientRow[];
  onRowAction?: (row: ManagementClientRow) => void;
  onRowClick?: (row: ManagementClientRow) => void;
  className?: string;
};

// Reusable table for the management > clients screen.
// Pass in an array of row objects instead of hard-coding the table content here.
// Example:
// <ManagementClientTable
//   rows={clientRows}
//   onRowAction={(row) => console.log(row.name)}
// />
//
// How it works:
// - `rows` controls the visible table data.
// - `statusTone` changes the badge color.
// - `onRowAction` is optional and can be used for a menu, details drawer, or edit screen.
// - `onRowClick` can open a project details page when a row is selected.
export default function ManagementClientTable({ rows, onRowAction, onRowClick, className = "" }: ManagementClientTableProps) {
  return (
    <section className={`management-client-table ${className}`.trim()} aria-label="Clients table">
      <div className="management-client-table__header" role="row">
        <div className="management-client-table__cell management-client-table__cell--client">Client</div>
        <div className="management-client-table__cell">Total Paid</div>
        <div className="management-client-table__cell">Outstanding</div>
        <div className="management-client-table__cell">Projects</div>
        <div className="management-client-table__cell">Status</div>
        <div className="management-client-table__cell management-client-table__cell--actions" aria-hidden="true" />
      </div>

      <div className="management-client-table__body">
        {rows.map((row) => (
          <div
            key={row.clientId}
            className={`management-client-table__row ${onRowClick ? "management-client-table__row--clickable" : ""}`.trim()}
            role="row"
            onClick={() => onRowClick?.(row)}
          >
            <div className="management-client-table__cell management-client-table__cell--client">
              <div className="management-client-table__identity">
                <div className="management-client-table__avatar" aria-hidden="true">
                  {row.initials}
                </div>
                <div className="management-client-table__identity-copy">
                  <div className="management-client-table__name">{row.name}</div>
                  <div className="management-client-table__company">{row.company}</div>
                </div>
              </div>
            </div>

            <div className="management-client-table__cell">
              <div className="management-client-table__value">{row.totalPaid}</div>
              <div className="management-client-table__subvalue">total paid</div>
            </div>

            <div className="management-client-table__cell">
              <div className={`management-client-table__value ${row.statusTone === "warning" ? "management-client-table__value--warning" : ""}`.trim()}>
                {row.outstanding}
              </div>
              <div className="management-client-table__subvalue">outstanding</div>
            </div>

            <div className="management-client-table__cell">
              <div className="management-client-table__value">{row.projects}</div>
              <div className="management-client-table__subvalue">{row.activeProjects}</div>
            </div>

            <div className="management-client-table__cell">
              <span className={`management-client-table__badge management-client-table__badge--${row.statusTone ?? "neutral"}`.trim()}>
                {row.status}
              </span>
            </div>

            <div className="management-client-table__cell management-client-table__cell--actions">
              <button
                type="button"
                className="management-client-table__action-button"
                onClick={(event) => {
                  event.stopPropagation();
                  onRowAction?.(row);
                }}
                aria-label={`Open actions for ${row.name}`}
              >
                <span aria-hidden="true">•••</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}