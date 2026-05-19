import React, { useEffect, useState, useMemo } from "react";
import "./Workers.css";
import StatCard from "../../components/StatCard";
import { SearchInput } from "../../components/SearchInput";
import { FilterButton } from "../../components/FilterButton";
import { SortButton } from "../../components/SortButton";
import WorkerCard, { WorkerCardProps } from "../../components/WorkerCard";
import { API_BASE_URL } from "../../config";
import { AddButton } from "../../components/AddButton";
import { WorkerAddModal } from "../../components/WorkerAddModal";

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
    case 4:
      return "Owner";      
    default:
      return `Role ${roleID}`;
  }
};

// Centralized DTO -> UI mapping
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
  const [searchTerm, setSearchTerm] = useState("");

  const fetchWorkers = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText || "Failed to load workers");
      }

      const data: UserDisplay[] = await response.json();

      const mappedWorkers = (data ?? [])
        .filter((user) => user.roleID !== 1)
        .map(mapUserToWorkerCard);

      setWorkers(mappedWorkers);
    } catch (err: any) {
      setError(err.message || "Failed to fetch workers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleWorkerClick = (worker: WorkerCardProps) => {
    console.log("Open worker:", worker.name);
  };

  const handleWorkerSubmit = async (data: any) => {
    console.log("Submitting new worker:", data);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE_URL}/api/Auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to create worker");
      }

      setWorkerModalOpen(false);
      await fetchWorkers();
      console.log("Worker added successfully!");
    } catch (err: any) {
      console.error("Failed to add worker:", err);
      setWorkerModalOpen(false);
      setTimeout(() => setWorkerModalOpen(true), 100);
      alert("Failed to add worker: " + (err.message || "Unknown error"));
    }
  };

  // Generate Invite Code - robust parsing
  const handleGenerateInviteCode = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/Auth/generate-invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to generate invite code");
      }

      const data = await response.json();
      const inviteCode = data?.inviteCode ?? data?.InviteCode ?? data?.code ?? "N/A";
      const expiresRaw = data?.expiresAt ?? data?.ExpiresAt ?? data?.expires_at;
      let expiresDisplay = "N/A";
      if (expiresRaw) {
        try {
          expiresDisplay = new Date(expiresRaw).toLocaleString();
        } catch {
          expiresDisplay = String(expiresRaw);
        }
      }

      alert(
        `Invite Code Generated!\n\n` +
        `Code: ${inviteCode}\n\n` +
        `Expires: ${expiresDisplay}\n\n` +
        `Share this code with your workers.`
      );
    } catch (err: any) {
      alert("Failed to generate invite code: " + (err.message || "Unknown error"));
    }
  };

  // Stats (always based on full list)
  const totalWorkers = workers.length;
	const foremen = workers.filter((w) => w.role === "Foreman").length;
	const owners = workers.filter((w) => w.role === "Owner").length; 
  const visibleWorkersCount = workers.filter((w) => w.role === "Worker").length;
  const onlineWorkers = workers.filter((w) => w.status === "Online").length;

  // Search filtering
  const filteredWorkers = useMemo(() => {
    if (!searchTerm.trim()) return workers;
    const term = searchTerm.toLowerCase().trim();
    return workers.filter(
      (w) =>
        w.name.toLowerCase().includes(term) ||
        w.email.toLowerCase().includes(term) ||
        w.role.toLowerCase().includes(term)
    );
  }, [workers, searchTerm]);

  const [currentUserRole, setCurrentUserRole] = useState<number>(0);

	useEffect(() => {
		const token = localStorage.getItem("token");
		if (token) {
			try {
				// Decode JWT to get RoleID
				const payload = JSON.parse(atob(token.split('.')[1]));
				const role = parseInt(payload.RoleID || payload["RoleID"] || "0");
				setCurrentUserRole(role);
			} catch (e) {
				console.error("Failed to decode token");
			}
		}
	}, []);

  return (
    <>
      <div className="workers-page">
        {/* Stats */}
        <div className="workers-page__stats">
          <StatCard value={String(onlineWorkers)} label="Online Workers" tone="success" />
          <StatCard value={String(foremen)} label="Foremen" tone="warning" />
          <StatCard value={String(visibleWorkersCount)} label="Workers" tone="neutral" />
          <StatCard value={String(totalWorkers)} label="Total Team" tone="neutral" />
        </div>

        {/* Controls */}
        <div className="workers-page__controls">
          <SearchInput
            placeholder="Search workers, roles, or projects..."
            onSearch={setSearchTerm}
          />
          <FilterButton label="All Status" onFilter={() => console.log("Filter clicked")} />
          <SortButton label="Sort" onSort={() => console.log("Sort clicked")} />
        </div>

        <section className="workers-page__section">
          <div className="workers-page__section-header">
            <div className="workers-page__section-header-top">
              <div>
                <h2 className="workers-page__title">Workers</h2>
                <p className="workers-page__subtitle">Manage your team members</p>
              </div>
             <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
  
							  {/* Only Admin (1), Foreman (2), and Owner (4) can generate invite codes */}
							  {[1, 2, 4].includes(currentUserRole) && (
								  <AddButton
									  label="Generate Invite Code"
									  onClick={handleGenerateInviteCode}
								  />
							  )}

							  <AddButton
								  label="Add Worker"
								  onClick={() => setWorkerModalOpen(true)}
							  />
						  </div>
            </div>
          </div>

          {loading ? (
            <p style={{ padding: 20 }}>Loading workers...</p>
          ) : error ? (
            <p style={{ padding: 20, color: "red" }}>Error: {error}</p>
          ) : filteredWorkers.length === 0 ? (
            <p style={{ padding: 20 }}>
              {searchTerm.trim() ? "No workers match your search." : "No workers found yet."}
            </p>
          ) : (
            <div className="workers-page__grid">
              {filteredWorkers.map((worker) => (
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

      <WorkerAddModal
        open={workerModalOpen}
        onClose={() => setWorkerModalOpen(false)}
        onSubmit={handleWorkerSubmit}
      />
    </>
  );
}