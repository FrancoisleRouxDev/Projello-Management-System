import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Clients.css";
import StatCard from "../../components/StatCard";
import ManagementClientTable, { ManagementClientRow } from "../../components/ManagementClientTable";
import { SearchInput } from "../../components/SearchInput";
import { FilterButton } from "../../components/FilterButton";
import { SortButton } from "../../components/SortButton";
import { AddButton } from "../../components/AddButton";
import { API_BASE_URL } from "../../config";
import ClientAddModal from "../../components/ClientAddModal";
import { ProjectAddModal } from "../../components/ProjectAddModal";

type ClientSummary = {
    totalRevenue: number | null;
    outstanding: number | null;
    activeClients: number;
    blacklistClients: number;
};

const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "N/A";
    return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
        maximumFractionDigits: 0,
    }).format(value);
};

const getInitials = (fullName?: string) => {
    if (!fullName) return "--";
    const parts = fullName.split(" ").filter(Boolean);
    if (parts.length === 0) return "--";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
    return (
        <div className="action-modal__header">
            <h3 className="action-modal__title">{title}</h3>
            <button className="action-modal__close" onClick={onClose} aria-label="Close modal">×</button>
        </div>
    );
}

type ModalStep = "menu" | "blacklist-reason" | "status-pick" | "confirm-unblacklist";

interface ActionModalProps {
    row: ManagementClientRow;
    onClose: () => void;
    onRefresh: () => void | Promise<void>;
    onAddProject?: (row: ManagementClientRow) => void;
}

function ClientActionModal({ row, onClose, onRefresh, onAddProject }: ActionModalProps) {
    const [step, setStep] = useState<ModalStep>("menu");
    const [blacklistReason, setBlacklistReason] = useState("");
    const [busy, setBusy] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);

    const isBlacklisted = row.status === "Blacklisted";

    const doBlacklist = async () => {
        setBusy(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/clients/${row.clientId}/blacklist`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ reason: blacklistReason || "No reason provided" }),
            });
            if (!res.ok) throw new Error("Failed to blacklist client");
            setFeedback(`${row.name} has been blacklisted.`);
            await onRefresh();
        } catch {
            setFeedback("Failed to blacklist client. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const doUnblacklist = async () => {
        setBusy(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/clients/${row.clientId}/blacklist`, {
                method: "DELETE",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (!res.ok) throw new Error("Failed to remove from blacklist");
            setFeedback(`${row.name} has been removed from the blacklist.`);
            await onRefresh();
        } catch {
            setFeedback("Failed to remove from blacklist. Please try again.");
        } finally {
            setBusy(false);
        }
    };

    const doStatusChange = (statusLabel: string) => {
        setFeedback(`Status for "${row.name}" changed to ${statusLabel} (UI only for now).`);
        void onRefresh();
    };

    if (feedback) {
        return (
            <div className="action-modal-overlay" onClick={onClose}>
                <div className="action-modal" onClick={e => e.stopPropagation()}>
                    <ModalHeader title="Done" onClose={onClose} />
                    <div className="action-modal__body">
                        <p className="action-modal__feedback">{feedback}</p>
                    </div>
                    <div className="action-modal__actions">
                        <button className="action-modal__btn action-modal__btn--primary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === "menu") {
        return (
            <div className="action-modal-overlay" onClick={onClose}>
                <div className="action-modal" onClick={e => e.stopPropagation()}>
                    <ModalHeader title={row.name} onClose={onClose} />
                    <div className="action-modal__body">
                        <p className="action-modal__sub">Choose an action below</p>
                    </div>
                    <div className="action-modal__actions">
                        <button
                            className={`action-modal__btn ${isBlacklisted ? "action-modal__btn--warning" : "action-modal__btn--danger"}`}
                            onClick={() => setStep(isBlacklisted ? "confirm-unblacklist" : "blacklist-reason")}
                        >
                            {isBlacklisted ? "Remove from Blacklist" : "Blacklist Client"}
                        </button>

                        <button className="action-modal__btn action-modal__btn--secondary" onClick={() => setStep("status-pick")}>
                            Change Status
                        </button>

                        <button className="action-modal__btn action-modal__btn--secondary" onClick={() => setFeedback("Edit functionality coming soon.")}>
                            Edit Client
                        </button>

                        <button
                            className="action-modal__btn action-modal__btn--secondary"
                            onClick={() => {
                                onClose();
                                onAddProject?.(row);
                            }}
                        >
                            Add New Project
                        </button>

                        <button className="action-modal__btn action-modal__btn--ghost" onClick={onClose}>Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === "blacklist-reason") {
        return (
            <div className="action-modal-overlay" onClick={onClose}>
                <div className="action-modal" onClick={e => e.stopPropagation()}>
                    <ModalHeader title={`Blacklist "${row.name}"`} onClose={onClose} />
                    <div className="action-modal__body">
                        <p className="action-modal__sub">Enter a reason (optional)</p>
                        <textarea
                            className="action-modal__textarea"
                            placeholder="No reason provided"
                            value={blacklistReason}
                            onChange={e => setBlacklistReason(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <div className="action-modal__actions">
                        <button className="action-modal__btn action-modal__btn--danger" onClick={doBlacklist} disabled={busy}>
                            {busy ? "Blacklisting..." : "Confirm Blacklist"}
                        </button>
                        <button className="action-modal__btn action-modal__btn--ghost" onClick={() => setStep("menu")}>Back</button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === "confirm-unblacklist") {
        return (
            <div className="action-modal-overlay" onClick={onClose}>
                <div className="action-modal" onClick={e => e.stopPropagation()}>
                    <ModalHeader title="Remove from Blacklist?" onClose={onClose} />
                    <div className="action-modal__body">
                        <p className="action-modal__sub">Are you sure you want to remove <strong>"{row.name}"</strong> from the blacklist?</p>
                    </div>
                    <div className="action-modal__actions">
                        <button className="action-modal__btn action-modal__btn--warning" onClick={doUnblacklist} disabled={busy}>
                            {busy ? "Removing..." : "Yes, Remove from Blacklist"}
                        </button>
                        <button className="action-modal__btn action-modal__btn--ghost" onClick={() => setStep("menu")}>Back</button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === "status-pick") {
        return (
            <div className="action-modal-overlay" onClick={onClose}>
                <div className="action-modal" onClick={e => e.stopPropagation()}>
                    <ModalHeader title="Change Status" onClose={onClose} />
                    <div className="action-modal__body">
                        <p className="action-modal__sub">Select a new status for <strong>"{row.name}"</strong></p>
                    </div>
                    <div className="action-modal__actions">
                        <button className="action-modal__btn action-modal__btn--primary" onClick={() => doStatusChange("Active")}>Active</button>
                        <button className="action-modal__btn action-modal__btn--secondary" onClick={() => doStatusChange("Pending")}>Pending</button>
                        <button className="action-modal__btn action-modal__btn--secondary" onClick={() => doStatusChange("Completed")}>Completed</button>
                        <button className="action-modal__btn action-modal__btn--ghost" onClick={() => setStep("menu")}>Back</button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

export default function ClientsPage() {
    const navigate = useNavigate();

    const [rows, setRows] = useState<ManagementClientRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<number>(0);
    const [showAddModal, setShowAddModal] = useState(false);
    const [actionRow, setActionRow] = useState<ManagementClientRow | null>(null);
    const [summary, setSummary] = useState<ClientSummary>({
        totalRevenue: null,
        outstanding: null,
        activeClients: 0,
        blacklistClients: 0,
    });

    const [showProjectAddModal, setShowProjectAddModal] = useState(false);
    const [selectedClientForProject, setSelectedClientForProject] = useState<ManagementClientRow | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                const role = parseInt(payload.RoleID || payload["RoleID"] || "0");
                setCurrentUserRole(role);
            } catch {}
        }
    }, []);

    const fetchClients = async () => {
    setLoading(true);
    setError(null);
    try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/clients`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error(await res.text() || "Failed to load clients");

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

        const blacklistedCount = mapped.filter((row) => row.status === "Blacklisted").length;
        const activeCount = mapped.length - blacklistedCount;

        setSummary({
            totalRevenue: null,
            outstanding: null,
            activeClients: activeCount,
            blacklistClients: blacklistedCount,
        });
    } catch (err: any) {
        setError(err.message || "Failed to fetch clients");
    } finally {
        setLoading(false);
    }
};

    const fetchClientSummary = async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE_URL}/api/clients/summary`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            if (!res.ok) throw new Error(await res.text() || "Failed to load client summary");

            const data = await res.json();

            setSummary({
                totalRevenue: data.totalRevenue ?? data.TotalRevenue ?? null,
                outstanding: data.outstanding ?? data.Outstanding ?? null,
                activeClients: data.activeClients ?? data.ActiveClients ?? 0,
                blacklistClients: data.blacklistClients ?? data.BlacklistClients ?? 0,
            });
        } catch {
            setSummary({
                totalRevenue: null,
                outstanding: null,
                activeClients: 0,
                blacklistClients: 0,
            });
        }
    };

    const refreshClientsPageData = async () => {
        await Promise.all([fetchClients(), fetchClientSummary()]);
    };

    useEffect(() => {
        void refreshClientsPageData();
    }, []);

    const handleRowAction = (row: ManagementClientRow) => setActionRow(row);
    const handleRowClick = (row: ManagementClientRow) => navigate(`/single-view/${row.clientId}`);

    const handleAddProject = (row: ManagementClientRow) => {
        setSelectedClientForProject(row);
        setShowProjectAddModal(true);
    };

    return (
        <div className="clients-page">
            <div className="clients-page__stats">
                {/* Total Revenue */}
                {/* <StatCard
                    value={formatCurrency(summary.totalRevenue)}
                    label="Total Revenue"
                    tone="success"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#16a34a">
                            <path d="M21 7.5a.75.75 0 0 0-.75-.75H3.75A.75.75 0 0 0 3 7.5v9a.75.75 0 0 0 .75.75h16.5a.75.75 0 0 0 .75-.75v-9ZM12 12.75a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75Z" />
                        </svg>
                    }
                /> */}

                {/* Outstanding - Using the exact icon you wanted */}
                {/* <StatCard
                    value={formatCurrency(summary.outstanding)}
                    label="Outstanding"
                    tone="warning"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 28 28" fill="#f59e0b">
                            <path d="M13.27 24.367a2.5 2.5 0 0 0-.222 1.61C7.755 25.71 4 23.226 4 19.714V19a3 3 0 0 1 3-3h10.46zM14 2a6 6 0 1 1 0 12a6 6 0 0 1 0-12m5.164 12.828l-5.002 9.992c-.501 1 .222 2.18 1.336 2.18h10.004c1.114 0 1.837-1.18 1.336-2.18l-5.002-9.992c-.552-1.104-2.12-1.104-2.672 0M21 17.5v5a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 1 0m-.5 7.5a.5.5 0 1 1 0-1a.5.5 0 0 1 0 1" />
                        </svg>
                    }
                /> */}

                {/* Active Clients */}
                <StatCard
                    value={String(summary.activeClients)}
                    label="Active Clients"
                    tone="success"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#0ea5e9">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                    }
                />

                {/* Blacklisted */}
                <StatCard
                    value={String(summary.blacklistClients)}
                    label="Blacklisted"
                    tone="danger"
                    icon={
                        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#ef4444">
                            <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                        </svg>
                    }
                />
            </div>

            <div className="clients-page__controls">
                <SearchInput placeholder="Search clients..." onSearch={(v) => console.log(v)} />
                {/* <FilterButton label="All Status" onFilter={() => {}} />
                <SortButton label="Sort" onSort={() => {}} /> */}
            </div>

            <section className="clients-page__table-section">
                <div className="clients-page__section-header">
                    <div className="clients-page__section-header-top">
                        <div>
                            <h2 className="clients-page__title">Clients</h2>
                            <p className="clients-page__subtitle">Manage customer accounts, balances, and project counts.</p>
                        </div>
                        {[1, 4].includes(currentUserRole) && <AddButton label="Add Client" onClick={() => setShowAddModal(true)} />}
                    </div>
                </div>

                {loading ? <p className="clients-page__message">Loading clients...</p> :
                 error ? <p className="clients-page__message--error">Error: {error}</p> :
                 <ManagementClientTable rows={rows} onRowAction={handleRowAction} onRowClick={handleRowClick} />}
            </section>

            <ClientAddModal open={showAddModal} onClose={() => setShowAddModal(false)} onClientAdded={fetchClients} />

            {actionRow && (
                <ClientActionModal
                    row={actionRow}
                    onClose={() => setActionRow(null)}
                    onRefresh={fetchClients}
                    onAddProject={handleAddProject}
                />
            )}

            {showProjectAddModal && selectedClientForProject && (
                <ProjectAddModal
                    open={showProjectAddModal}
                    onClose={() => {
                        setShowProjectAddModal(false);
                        setSelectedClientForProject(null);
                    }}
                    clientId={selectedClientForProject.clientId}
                    clientName={selectedClientForProject.name}
                    disableClientName={true}
                    onSubmit={async (data) => {
                        try {
                            const token = localStorage.getItem("token");
                            const res = await fetch(`${API_BASE_URL}/api/projects`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                                },
                                body: JSON.stringify({
                                    name: data.name.trim(),
                                    description: data.description?.trim() || null,
                                    clientID: parseInt(selectedClientForProject.clientId, 10),
                                    status: "Planning",
                                    dueDate: data.dueDate || null,
                                    startDate: null,
                                }),
                            });
                            if (!res.ok) throw new Error(await res.text() || "Failed to create project");
                            alert("Project created successfully!");
                            await refreshClientsPageData();
                        } catch (err: any) {
                            alert("Failed to create project: " + err.message);
                        } finally {
                            setShowProjectAddModal(false);
                            setSelectedClientForProject(null);
                        }
                    }}
                />
            )}
        </div>
    );
}