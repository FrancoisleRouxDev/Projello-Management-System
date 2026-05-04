import React from "react";
import { useNavigate } from "react-router-dom";
import "./Clients.css";
import StatCard from "../../components/StatCard";
import ManagementClientTable, { ManagementClientRow } from "../../components/ManagementClientTable";
import { SearchInput } from "../../components/SearchInput";
import { FilterButton } from "../../components/FilterButton";
import { SortButton } from "../../components/SortButton";

// Starter data for the clients screen.
// Replace this array with API data once the backend endpoint is ready.
const SAMPLE_CLIENT_ROWS: ManagementClientRow[] = [
	{
		clientId: "james-walker",
		initials: "JW",
		name: "James Walker",
		company: "Walker & Co.",
		totalPaid: "R 40,000",
		outstanding: "R 0",
		projects: "2",
		activeProjects: "1 active",
		status: "Active",
		statusTone: "success",
	},
	{
		clientId: "sam-vice",
		initials: "SV",
		name: "Sam Vice",
		company: "Zyntra Labs",
		totalPaid: "R 86,000",
		outstanding: "R 8,000",
		projects: "1",
		activeProjects: "1 active",
		status: "Has Balance",
		statusTone: "warning",
	},
	{
		clientId: "christian-simpson",
		initials: "CS",
		name: "Christian Simpson",
		company: "Veimore",
		totalPaid: "R 23,000",
		outstanding: "R 0",
		projects: "3",
		activeProjects: "2 active",
		status: "Active",
		statusTone: "success",
	},
	{
		clientId: "lily-louwe",
		initials: "LL",
		name: "Lily Louwe",
		company: "Luma",
		totalPaid: "R 100,000",
		outstanding: "R 0",
		projects: "2",
		activeProjects: "0 active",
		status: "Active",
		statusTone: "success",
	},
	{
		clientId: "willow-du-plessis",
		initials: "WDP",
		name: "Willow du Plessis",
		company: "Oryn Collective",
		totalPaid: "R 2,000",
		outstanding: "R 120,000",
		projects: "3",
		activeProjects: "2 active",
		status: "Blacklisted",
		statusTone: "danger",
	},
];

export default function ClientsPage() {
	const navigate = useNavigate();

	const handleRowAction = (row: ManagementClientRow) => {
		// TODO: Open a drawer, menu, or details page for this client.
		console.log("Row action for:", row.name);
	};

	const handleRowClick = (row: ManagementClientRow) => {
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

				<ManagementClientTable rows={SAMPLE_CLIENT_ROWS} onRowAction={handleRowAction} onRowClick={handleRowClick} />
			</section>
		</div>
	);
}

