import React from "react";
import "./Workers.css";
import StatCard from "../../components/StatCard";
import { SearchInput } from "../../components/SearchInput";
import { FilterButton } from "../../components/FilterButton";
import { SortButton } from "../../components/SortButton";

export default function WorkersPage() {
	// TODO: Replace this placeholder with a WorkersTable component.
	// Keep the same pattern as the clients table: props in, rendering out, no hard-coded page data.
	return (
		<div className="workers-page">
			{/* Summary cards for worker status */}
			<div className="workers-page__stats">
				<StatCard value="4" label="Active Workers" tone="success" />
				<StatCard value="2" label="Away" tone="warning" />
				<StatCard value="1" label="Offline" tone="neutral" />
				<StatCard value="7" label="Total Workers" tone="neutral" />
			</div>

			{/* Search and filter controls positioned under the worker stats */}
			<div className="workers-page__controls">
				<SearchInput placeholder="Search workers, roles, or projects..." onSearch={(value) => console.log("Search workers:", value)} />
				<FilterButton label="All Status" onFilter={() => console.log("Open worker status filter")} />
				<SortButton label="Sort" onSort={() => console.log("Open worker sort options")} />
			</div>

			{/* Placeholder content while you build the workers table */}
			<section className="workers-page__empty-state">
				<h2 className="workers-page__title">Workers</h2>
				<p className="workers-page__subtitle">
					Build a reusable workers table here using the same pattern as the client table.
				</p>
			</section>
		</div>
	);
}

