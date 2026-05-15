import React, { useEffect, useState } from "react";
import "./Workers.css";
import StatCard from "../../components/StatCard";
import { SearchInput } from "../../components/SearchInput";
import { FilterButton } from "../../components/FilterButton";
import { SortButton } from "../../components/SortButton";
import WorkerCard, { WorkerCardProps } from "../../components/WorkerCard";
import { AddButton } from "../../components/AddButton";
import { ReusableEntryModal } from "../../components/ReuseableEntityModal";

interface UserDisplay {
id: string;
fullName: string;
email: string;
roleID: number;
isTwoFactorEnabled: boolean;
isOnline?: boolean;
}


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
const mapUserToWorkerCard = (user: UserDisplay): WorkerCardProps => ({
	initials: getInitials(user.fullName),
	name: user.fullName,
	email: user.email,
	role: getRoleLabel(user.roleID),
	status: user.isOnline ? "Online" : "Offline",
	statusTone: user.isOnline ? "success" : "neutral",
});

export default function WorkersPage() {
	const [workers, setWorkers] = useState<WorkerCardProps[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [workerModalOpen, setWorkerModalOpen] = useState(false);

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

				const data: UserDisplay[] = await response.json();
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

	const handleWorkerSubmit = (data: any) => {
		console.log("New worker data:", data);
		// TODO: Submit to API endpoint
		// TODO: Refresh workers list
	};

	// Dashboard counters are derived from current fetched data.
	const totalWorkers = workers.length;
	const foremen = workers.filter((worker) => worker.role === "Foreman").length;
	const visibleWorkers = workers.filter((worker) => worker.role === "Worker").length;
	const onlineWorkers = workers.filter((worker) => worker.status === "Online").length;

	return (
		<>
			<div className="workers-page">
				{/* Summary cards for worker status */}
				<div className="workers-page__stats">
					<StatCard value={String(onlineWorkers)} label="Online Workers" tone="success" />
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
						<div className="workers-page__section-header-top">
							<h2 className="workers-page__title">Workers</h2>
						<AddButton label="Worker" onClick={() => setWorkerModalOpen(true)} />
						</div>
						<p className="workers-page__subtitle">Manage your team members</p>
					</div>

					{loading ? (
						<p className="workers-page__state">Loading workers...</p>
					) : error ? (
						<p className="workers-page__state workers-page__state--error">Error: {error}</p>
					) : workers.length === 0 ? (
						<p className="workers-page_state">No workers found yet.</p>
					) : (
						<div className="workers-page__grid">
							{workers.map((worker) => (
								<button
									type="button"
									className="workers-page__card-button"
									onClick={() => handleWorkerClick(worker)}
									  aria-label={`View details for ${worker.name}`}
								>
									<WorkerCard {...worker} />
								</button>
							))}
						</div>
					)}
				</section>
			</div>
			<ReusableEntryModal<{ fullName: string; email: string; roleID: number; phone: string }>
				open={workerModalOpen}
				title="Add New Worker"
				submitLabel="Add Worker"
				onClose={() => setWorkerModalOpen(false)}
				onSubmit={(data) => {
					console.log("New worker data:", data);
				}}
				initialValues={{ fullName: "", email: "", roleID: 3, phone: "" }}
				validate={(values) => {
					if (!values.fullName.trim()) return "Full name is required";
					if (!values.email.trim()) return "Email is required";
					return null;
				}}
				renderFields={(values, setValue, error) => (
					<div className="reusable-entity-modal__content">
						{error && <div className="reusable-entity-modal__error">{error}</div>}

						<div className="reusable-entity-modal__form-group">
							<label className="reusable-entity-modal__label reusable-entity-modal__label--required">
								Full Name
							</label>
							<input
								className="reusable-entity-modal__input"
								type="text"
								value={values.fullName}
								onChange={(e) => setValue("fullName", e.target.value)}
								placeholder="Enter full name"
							/>
						</div>

						<div className="reusable-entity-modal__form-group">
							<label className="reusable-entity-modal__label reusable-entity-modal__label--required">
								Email
							</label>
							<input
								className="reusable-entity-modal__input"
								type="email"
								value={values.email}
								onChange={(e) => setValue("email", e.target.value)}
								placeholder="Enter email address"
							/>
						</div>

						<div className="reusable-entity-modal__form-group">
							<label className="reusable-entity-modal__label" htmlFor="worker-role">
								Role
							</label>
							<select
								id="worker-role"
								className="reusable-entity-modal__select"
								value={values.roleID}
								onChange={(e) => setValue("roleID", Number(e.target.value))}
							>
								<option value={3}>Worker</option>
								<option value={2}>Foreman</option>
							</select>
						</div>

						{/* <div className="reusable-entity-modal__form-group">
							<label className="reusable-entity-modal__label">
								Phone
							</label>
							<input
								className="reusable-entity-modal__input"
								type="tel"
								value={values.phone}
								onChange={(e) => setValue("phone", e.target.value)}
								placeholder="Enter phone number"
							/>
						</div> */}
					</div>
				)}
				/>
		</>
	);
}

