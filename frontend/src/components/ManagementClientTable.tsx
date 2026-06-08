import React from "react";
import { Dropdown } from "antd";
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
  onActionSelect?: (row: ManagementClientRow, actionKey: string) => void;
  className?: string;
  hideProjectsColumn?: boolean;
};

export default function ManagementClientTable({
  rows,
  onRowAction,
  onRowClick,
  onActionSelect,
  className = "",
  hideProjectsColumn = false,
}: ManagementClientTableProps) {
  return (
    <section
      className={`management-client-table ${className}`.trim()}
      role="table"
      aria-label="Clients table"
    >
      {/* Header */}
      <div className="management-client-table__header" role="rowgroup">
        <div role="row" className="management-client-table__header-row">
          <div className="management-client-table__cell management-client-table__cell--client" role="columnheader">Client</div>
          {/* <div className="management-client-table__cell" role="columnheader">Total Paid</div>
          <div className="management-client-table__cell" role="columnheader">Outstanding</div> */}
          <div className="management-client-table__cell" role="columnheader">Status</div>
          <div className="management-client-table__cell" role="columnheader">Projects</div>
          {/* <div className="management-client-table__cell management-client-table__cell--actions" role="columnheader" aria-hidden="true" /> */}
        </div>
      </div>

      {/* Body */}
      <div className="management-client-table__body" role="rowgroup">
        {rows.map((row) => (
          <div
            key={row.clientId}
            className={`management-client-table__row ${onRowClick ? "management-client-table__row--clickable" : ""}`.trim()}
            role="row"
            onClick={() => onRowClick?.(row)}
          >
            {/* Client */}
            <div className="management-client-table__cell management-client-table__cell--client" role="cell">
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

            {/* <div className="management-client-table__cell" role="cell">
              <div className="management-client-table__value">{row.totalPaid}</div>
              <div className="management-client-table__subvalue">total paid</div>
            </div> */}

            {/* <div className="management-client-table__cell" role="cell">
              <div className={`management-client-table__value ${row.statusTone === "warning" ? "management-client-table__value--warning" : ""}`.trim()}>
                {row.outstanding}
              </div>
              <div className="management-client-table__subvalue">outstanding</div>
            </div> */}

<div className="management-client-table__cell" role="cell">
              <span className={`management-client-table__badge management-client-table__badge--${row.statusTone ?? "neutral"}`.trim()}>
                {row.status}
              </span>
            </div>

            <div className="management-client-table__cell" role="cell">
              <div className="management-client-table__value">{row.projects} Projects</div>
              {/* <div className="management-client-table__subvalue">{row.activeProjects} Projects</div> */}
            </div>

            

            <div className="management-client-table__cell management-client-table__cell--actions" id="blacklistBtn" role="cell">
              <div onClick={(e) => e.stopPropagation()}>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: "toggleBlacklist",
                        label: row.status === "Blacklisted" ? "Unblacklist" : "Blacklist",
                        onClick: (info: any) => {
                          info?.domEvent?.stopPropagation();
                          onActionSelect?.(row, "toggleBlacklist");
                        },
                      },
                    ],
                  }}
                  trigger={["click"]}
                  placement="bottomRight"
                >
                  <button
                    type="button"
                    className="management-client-table__action-button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); onRowAction?.(row); }}
                    aria-label={`Open actions for ${row.name}`}
                  >
                    <span aria-hidden="true">•••</span>
                  </button>
                </Dropdown>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}