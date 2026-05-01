import React from "react";
import "./Clients.css";
import StatCard from "../../components/StatCard";
import ManagementClientTable, { ManagementClientRow } from "../../components/ManagementClientTable";

// Starter data for the clients screen.
// Replace this array with API data once the backend endpoint is ready.
const SAMPLE_CLIENT_ROWS: ManagementClientRow[] = [
	{
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
	const handleRowAction = (row: ManagementClientRow) => {
		// TODO: Open a drawer, menu, or details page for this client.
		console.log("Row action for:", row.name);
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

			{/* Client table section */}
			<section className="clients-page__table-section">
				<div className="clients-page__section-header">
					<h2 className="clients-page__title">Clients</h2>
					<p className="clients-page__subtitle">Manage customer accounts, balances, and project counts.</p>
				</div>

				<ManagementClientTable rows={SAMPLE_CLIENT_ROWS} onRowAction={handleRowAction} />
			</section>
		</div>
	);
}

