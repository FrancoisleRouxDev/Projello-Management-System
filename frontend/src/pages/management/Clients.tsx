import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Clients.css";
import StatCard from "../../components/StatCard";
import ManagementClientTable, { ManagementClientRow } from "../../components/ManagementClientTable";
import { SearchInput } from "../../components/SearchInput";
import { FilterButton } from "../../components/FilterButton";
import { SortButton } from "../../components/SortButton";
import { AddButton } from "../../components/AddButton";
import { ReusableEntryModal } from "../../components/ReuseableEntityModal";

/* ClientsPage - fetches and shows clients with inline action menu per row */

const getInitials = (fullName?: string) => {
  if (!fullName) return "--";
  const parts = fullName.split(" ").filter(Boolean);
  if (parts.length === 0) return "--";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function ClientsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState<ManagementClientRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5049/api/clients", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || res.statusText || "Failed to load clients");
        }
        const data = await res.json();
        const mapped: ManagementClientRow[] = (data ?? []).map((c: any) => ({
          clientId: String(c.clientID ?? c.ClientID ?? c.ClientId ?? ""),
          initials: getInitials(c.name ?? c.Name),
          name: c.name ?? c.Name ?? "",
          company: c.company ?? c.Company ?? "",
          totalPaid: c.totalPaid ?? "R 0",
          outstanding: c.outstanding ?? "R 0",
          projects: c.projects ? String(c.projects) : "0",
          activeProjects: c.activeProjects ?? "0 active",
          status: c.isBlacklisted || c.IsBlacklisted ? "Blacklisted" : "Active",
          statusTone: c.isBlacklisted || c.IsBlacklisted ? "danger" : "success",
        }));
        setRows(mapped);
      } catch (err: any) {
        setError(err.message || "Failed to fetch clients");
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const handleRowClick = (row: ManagementClientRow) => {
    navigate(`/single-view/${row.clientId}`);
  };

  const handleClientSubmit = (data: any) => {
    console.log("New client data:", data);
    // TODO: Submit to API endpoint and refresh list
  };

  const handleToggleBlacklist = async (clientId: string) => {
    const client = rows.find(r => r.clientId === clientId);
    if (!client) return;

    try {
      const token = localStorage.getItem("token");
      const isCurrentlyBlacklisted = client.status === "Blacklisted";

      // API assumed to exist; adjust endpoint/method as needed
      const response = await fetch(`http://localhost:5049/api/clients/${clientId}/blacklist`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ isBlacklisted: !isCurrentlyBlacklisted })
      });

      if (response.ok) {
        setRows(prevRows =>
          prevRows.map(row => {
            if (row.clientId === clientId) {
              const toggled = row.status === "Blacklisted" ? "Active" : "Blacklisted";
              return {
                ...row,
                status: toggled,
                statusTone: toggled === "Blacklisted" ? "danger" : "success",
              };
            }
            return row;
          })
        );
      } else {
        console.error("Failed to toggle blacklist status");
      }
    } catch (err) {
      console.error("Error toggling blacklist:", err);
    }
  };

  // Derived stats
  const totalRevenue = rows.reduce((sum, row) => {
    const paid = (row.totalPaid ?? "").replace(/[^0-9]/g, "");
    return sum + (parseInt(paid) || 0);
  }, 0);
  const totalOutstanding = rows.reduce((sum, row) => {
    const out = (row.outstanding ?? "").replace(/[^0-9]/g, "");
    return sum + (parseInt(out) || 0);
  }, 0);
  const activeClients = rows.filter(row => row.status === "Active").length;
  const blacklistedClients = rows.filter(row => row.status === "Blacklisted").length;

  return (
    <>
      <div className="clients-page">
        <div className="clients-page__stats">
          <StatCard value={`R${totalRevenue}k`} label="Total Revenue" tone="success" />
          <StatCard value={`R${totalOutstanding}k`} label="Outstanding" tone="warning" />
          <StatCard value={String(activeClients)} label="Active Clients" tone="success" />
          <StatCard value={String(blacklistedClients)} label="Blacklisted" tone="danger" />
        </div>

        <div className="clients-page__controls">
          <SearchInput placeholder="Search clients..." onSearch={(value) => console.log("Search clients:", value)} />
          <FilterButton label="All Status" onFilter={() => console.log("Open client status filter")} />
          <SortButton label="Sort" onSort={() => console.log("Open client sort options")} />
        </div>

        <section className="clients-page__table-section">
          <div className="clients-page__section-header">
            <div className="clients-page__section-header-top">
              <h2 className="clients-page__title">Clients</h2>
              <AddButton label="Client" onClick={() => setClientModalOpen(true)} />
            </div>
            <p className="clients-page__subtitle">Manage customer accounts, balances, and project counts.</p>
          </div>

          {loading ? (
            <p className="clients-page__state">Loading clients...</p>
          ) : error ? (
            <p className="clients-page__state clients-page__state--error">Error: {error}</p>
          ) : (
            <ManagementClientTable
              rows={rows}
              onRowClick={handleRowClick}
              onActionSelect={(row: ManagementClientRow, actionKey: string) => {
                if (actionKey === "toggleBlacklist") handleToggleBlacklist(row.clientId);
              }}
            />
          )}
        </section>
      </div>

      <ReusableEntryModal<{ name: string; company: string; email: string; phone: string }>
        open={clientModalOpen}
        title="Add New Client"
        submitLabel="Add Client"
        onClose={() => setClientModalOpen(false)}
        onSubmit={handleClientSubmit}
        initialValues={{ name: "", company: "", email: "", phone: "" }}
        validate={(values) => {
          if (!values.name.trim()) return "Name is required";
          if (!values.company.trim()) return "Company is required";
          if (!values.email.trim()) return "Email is required";
          return null;
        }}
        renderFields={(values, setValue, error) => (
          <div className="reusable-entity-modal__content">
            {error && <div className="reusable-entity-modal__error">{error}</div>}

            <div className="reusable-entity-modal__form-group">
              <label className="reusable-entity-modal__label reusable-entity-modal__label--required">Name</label>
              <input className="reusable-entity-modal__input" type="text" value={values.name} onChange={(e) => setValue("name", e.target.value)} placeholder="Enter client name" />
            </div>

            <div className="reusable-entity-modal__form-group">
              <label className="reusable-entity-modal__label reusable-entity-modal__label--required">Company</label>
              <input className="reusable-entity-modal__input" type="text" value={values.company} onChange={(e) => setValue("company", e.target.value)} placeholder="Enter company name" />
            </div>

            <div className="reusable-entity-modal__form-group">
              <label className="reusable-entity-modal__label reusable-entity-modal__label--required">Email</label>
              <input className="reusable-entity-modal__input" type="email" value={values.email} onChange={(e) => setValue("email", e.target.value)} placeholder="Enter email address" />
            </div>

            <div className="reusable-entity-modal__form-group">
              <label className="reusable-entity-modal__label">Phone</label>
              <input className="reusable-entity-modal__input" type="tel" value={values.phone} onChange={(e) => setValue("phone", e.target.value)} placeholder="Enter phone number" />
            </div>
          </div>
        )}
      />
    </>
  );
}

