import React, { useEffect, useState } from "react";
import "./Workers.css";
import StatCard from "../../components/StatCard";
import { SearchInput } from "../../components/SearchInput";
import { FilterButton } from "../../components/FilterButton";
import { SortButton } from "../../components/SortButton";
import WorkerCard, { WorkerCardProps } from "../../components/WorkerCard";

/*
 * WorkersPage
 * - Fetches users from backend: GET /api/users
 * - Uses JWT from localStorage (`token`) in Authorization header
 * - Converts `UserDisplayDto` into `WorkerCardProps` for card rendering
 * - Derives summary stats from fetched worker list
 *
 * Note: /api/users is currently admin-only in backend auth rules.
 */

type UserDisplayDto = {
	id: string;
	fullName: string;
	email: string;
	roleID: number;
	isTwoFactorEnabled: boolean;
};

// Creates compact initials for each worker card avatar.
const getInitials = (fullName?: string) => {
	if (!fullName) return "--";
	const parts = fullName.split(" ").filter(Boolean);
	if (parts.length === 0) return "--";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

// Maps numeric RoleID from backend to readable labels used in the UI.
const getRoleLabel = (roleID: number) => {
	switch (roleID) {
		case 1:
			return "Admin";
		case 2:
			return "Foreman";
		case 3:
			return "Worker";
		default:
			return `Role ${roleID}`;
	}
};

// Centralized DTO -> UI mapping so future API changes only require edits in one place.
const mapUserToWorkerCard = (user: UserDisplayDto): WorkerCardProps => ({
	initials: getInitials(user.fullName),
	name: user.fullName,
	email: user.email,
	role: getRoleLabel(user.roleID),
	assignedTo: `User ID: ${user.id}`,
	status: user.isTwoFactorEnabled ? "2FA On" : "2FA Off",
	statusTone: user.isTwoFactorEnabled ? "success" : "neutral",
});

export default function WorkersPage() {
	const [workers, setWorkers] = useState<WorkerCardProps[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Initial page load: fetch workers once and hydrate worker cards.
		const fetchWorkers = async () => {
			setLoading(true);
			setError(null);

			try {
				const token = localStorage.getItem("token");
				const response = await fetch("http://localhost:5049/api/users", {
					headers: token ? { Authorization: `Bearer ${token}` } : undefined,
				});

				if (!response.ok) {
					const text = await response.text();
					throw new Error(text || response.statusText || "Failed to load workers");
				}

				const data: UserDisplayDto[] = await response.json();
				// Hide admins from worker cards for now; this view focuses on field team users.
				const visibleWorkers = (data ?? [])
					.filter((user) => user.roleID !== 1)
					.map(mapUserToWorkerCard);

				setWorkers(visibleWorkers);
			} catch (err: any) {
				setError(err.message || "Failed to fetch workers");
			} finally {
				setLoading(false);
			}
		};

		fetchWorkers();
	}, []);

	const handleWorkerClick = (worker: WorkerCardProps) => {
		console.log("Open worker:", worker.name);
	};

	// Dashboard counters are derived from current fetched data.
	const totalWorkers = workers.length;
	const foremen = workers.filter((worker) => worker.role === "Foreman").length;
	const visibleWorkers = workers.filter((worker) => worker.role === "Worker").length;
	const twoFactorOn = workers.filter((worker) => worker.status === "2FA On").length;

	return (
		<div className="workers-page">
			{/* Summary cards for worker status */}
			<div className="workers-page__stats">
				<StatCard value={String(twoFactorOn)} label="2FA Enabled" tone="success" />
				<StatCard value={String(foremen)} label="Foremen" tone="warning" />
				<StatCard value={String(visibleWorkers)} label="Workers" tone="neutral" />
				<StatCard value={String(totalWorkers)} label="Total Team" tone="neutral" />
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

				{loading ? (
					<p style={{ padding: 20 }}>Loading workers...</p>
				) : error ? (
					<p style={{ padding: 20, color: "red" }}>Error: {error}</p>
				) : workers.length === 0 ? (
					<p style={{ padding: 20 }}>No workers found yet.</p>
				) : (
					<div className="workers-page__grid">
						{workers.map((worker) => (
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
				)}
			</section>
		</div>
	);
}

