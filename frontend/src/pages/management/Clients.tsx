import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Clients.css";
import StatCard from "../../components/StatCard";
import ManagementClientTable, { ManagementClientRow } from "../../components/ManagementClientTable";
import { SearchInput } from "../../components/SearchInput";
import { FilterButton } from "../../components/FilterButton";
import { SortButton } from "../../components/SortButton";

/*
 * ClientsPage
 * - Fetches clients from backend: GET /api/clients
 * - Uses JWT from localStorage (`token`) in Authorization header
 * - Maps API DTOs into `ManagementClientRow` for `ManagementClientTable`
 * - Handles loading and error states before rendering table rows
 */

// Build avatar initials from a full name for the table's identity cell.
const getInitials = (fullName?: string) => {
    if (!fullName) return "--";
    const parts = fullName.split(" ").filter(Boolean);
    if (parts.length === 0) return "--";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Note: `clientId` is kept as a string so it fits the existing `ManagementClientRow` type.

export default function ClientsPage() {
	const navigate = useNavigate();

	const [rows, setRows] = useState<ManagementClientRow[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Initial page load: fetch client list once when component mounts.
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
				// Normalize casing differences from API responses and map to table row shape.
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

	const handleRowAction = (row: ManagementClientRow) => {
		// TODO: Open a drawer, menu, or details page for this client.
		console.log("Row action for:", row.name);
	};

	const handleRowClick = (row: ManagementClientRow) => {
		// Navigates into the single-client project view route using client id.
		navigate(`/single-view/${row.clientId}`);
	};

	return (
		<div className="clients-page">
			{/* Summary cards for top-level client metrics */}
			<div className="clients-page__stats">
				<StatCard value="R400k" label="Total Revenue" tone="success" />
				<StatCard value="R30k" label="Outstanding" tone="warning" />
				<StatCard value="4" label="Active Clients" tone="success" />
				<StatCard value="1" label="Blacklisted" tone="danger" />
			</div>

			{/* Search and filter controls placed above the client table */}
			<div className="clients-page__controls">
				<SearchInput placeholder="Search clients..." onSearch={(value) => console.log("Search clients:", value)} />
				<FilterButton label="All Status" onFilter={() => console.log("Open client status filter")} />
				<SortButton label="Sort" onSort={() => console.log("Open client sort options")} />
			</div>

			{/* Client table section */}
			<section className="clients-page__table-section">
				<div className="clients-page__section-header">
					<h2 className="clients-page__title">Clients</h2>
					<p className="clients-page__subtitle">Manage customer accounts, balances, and project counts.</p>
				</div>

				{loading ? (
					<p style={{ padding: 20 }}>Loading clients...</p>
				) : error ? (
					<p style={{ padding: 20, color: "red" }}>Error: {error}</p>
				) : (
					<ManagementClientTable rows={rows} onRowAction={handleRowAction} onRowClick={handleRowClick} />
				)}
			</section>
		</div>
	);
}

