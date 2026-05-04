import React from "react";
import "./Workers.css";
import StatCard from "../../components/StatCard";
import { SearchInput } from "../../components/SearchInput";
import { FilterButton } from "../../components/FilterButton";
import { SortButton } from "../../components/SortButton";
import WorkerCard, { WorkerCardProps } from "../../components/WorkerCard";

const SAMPLE_WORKERS: WorkerCardProps[] = [
	{
		initials: "AR",
		name: "Alex Rivera",
		email: "alex@projello.io",
		role: "Lead Developer",
		assignedTo: "Aurora",
		status: "Active",
		statusTone: "success",
	},
	{
		initials: "MN",
		name: "Michael Naidoo",
		email: "michael@projello.io",
		role: "Managing Director",
		assignedTo: "Riverstone",
		status: "Away",
		statusTone: "warning",
	},
	{
		initials: "PB",
		name: "Pieter Botha",
		email: "pieter@projello.io",
		role: "Site Manager",
		assignedTo: "Umhlanga Coastal",
		status: "Offline",
		statusTone: "neutral",
	},
	{
		initials: "AG",
		name: "Anneke Govender",
		email: "anneke@projello.io",
		role: "Civil Engineer",
		assignedTo: "Stormwater Infrastructure",
		status: "Away",
		statusTone: "warning",
	},
	{
		initials: "JS",
		name: "Johan Steyn",
		email: "johan@projello.io",
		role: "Quantity Surveyor",
		assignedTo: "Budget & BOQ",
		status: "Active",
		statusTone: "success",
	},
	{
		initials: "BP",
		name: "Brandon Petersen",
		email: "brandon@projello.io",
		role: "Land Foreman",
		assignedTo: "Earthworks & Bulk Excavation",
		status: "Active",
		statusTone: "success",
	},
];

export default function WorkersPage() {
	const handleWorkerClick = (worker: WorkerCardProps) => {
		console.log("Open worker:", worker.name);
	};

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

			<section className="workers-page__section">
				<div className="workers-page__section-header">
					<h2 className="workers-page__title">Workers</h2>
					<p className="workers-page__subtitle">Manage your team members</p>
				</div>

				<div className="workers-page__grid">
					{SAMPLE_WORKERS.map((worker) => (
						<button
							type="button"
							key={`${worker.name}-${worker.email}`}
							className="workers-page__card-button"
							onClick={() => handleWorkerClick(worker)}
						>
							<WorkerCard {...worker} />
						</button>
					))}
				</div>
			</section>
		</div>
	);
}

