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
import { Users, UserCheck, HardHat, BadgeCheck } from "lucide-react";

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
          <StatCard 
            value={String(onlineWorkers)} 
            label="Online Workers" 
            tone="success"
            icon={
                 <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 28 28" fill="#16a34a">
                  <path d="M14 7.5A2.75 2.75 0 1 0 14 2a2.75 2.75 0 0 0 0 5.5M6.243 5.122a2.477 2.477 0 1 0-1.53 4.712l4.596 1.493a1 1 0 0 1 .691.951v3.097a1 1 0 0 1-.072.373l-2.752 6.856a2.477 2.477 0 0 0 1.365 3.215a2.46 2.46 0 0 0 3.209-1.363l.634-1.58A7.503 7.503 0 0 1 18 13.15v-.872a1 1 0 0 1 .691-.95l4.597-1.494a2.477 2.477 0 0 0-1.531-4.712l-3.11 1.01a1.87 1.87 0 0 0-1.012.822A4.25 4.25 0 0 1 14 9a4.25 4.25 0 0 1-3.635-2.046a1.87 1.87 0 0 0-1.011-.821zM26 20.5a6.5 6.5 0 1 1-13 0a6.5 6.5 0 0 1 13 0m-2.646-2.854a.5.5 0 0 0-.708 0L18 22.293l-1.646-1.647a.5.5 0 0 0-.708.708l2 2a.5.5 0 0 0 .708 0l5-5a.5.5 0 0 0 0-.708" />
                </svg>
    }
          />
          <StatCard 
            value={String(foremen)} 
            label="Foremen" 
            tone="warning" 
             icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 28 28" fill="#f59e0b">
                <path d="M12.278 2.403A3.75 3.75 0 0 0 7.02 4.582l-.246.75a2.25 2.25 0 0 1-1.438 1.439l-.751.246a3.75 3.75 0 0 0-2.179 5.258l.358.705a2.25 2.25 0 0 1 0 2.034l-.358.705a3.75 3.75 0 0 0 2.179 5.259l.75.246a2.25 2.25 0 0 1 1.439 1.438l.246.75a3.75 3.75 0 0 0 5.258 2.179l.705-.357a2.25 2.25 0 0 1 2.034 0l.705.357a3.75 3.75 0 0 0 5.259-2.178l.245-.751a2.25 2.25 0 0 1 1.439-1.438l.75-.246a3.75 3.75 0 0 0 2.179-5.259l-.357-.705a2.25 2.25 0 0 1 0-2.034l.357-.705a3.75 3.75 0 0 0-2.178-5.258l-.751-.246a2.25 2.25 0 0 1-1.438-1.438l-.247-.751a3.75 3.75 0 0 0-5.258-2.179l-.705.358a2.25 2.25 0 0 1-2.034 0zM14 12.5A3.25 3.25 0 1 1 14 6a3.25 3.25 0 0 1 0 6.5m6 3.643c0 3.214-2.686 5.357-6 5.357s-6-2.143-6-5.357C8 14.959 8.96 14 10.143 14h7.714c1.184 0 2.143.96 2.143 2.143" />
              </svg>
    }
          />
          <StatCard 
            value={String(visibleWorkersCount)} 
            label="Workers" 
            tone="neutral" 
             icon={
                 <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 28 28" fill="#64748b">
                  <path d="M21 16a3 3 0 0 1 3 3v.715C24 23.292 19.79 26 14 26S4 23.433 4 19.715V19a3 3 0 0 1 3-3zM14 2a6 6 0 1 1 0 12a6 6 0 0 1 0-12" />
                </svg>
    }
            />
          <StatCard 
            value={String(totalWorkers)} 
            label="Total Team" 
            tone="neutral" 
             icon={
                 <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 28 28" fill="#2563eb">
                  <path d="M17.754 11c.966 0 1.75.784 1.75 1.75v6.749a5.501 5.501 0 0 1-11.002 0V12.75c0-.966.783-1.75 1.75-1.75zM3.75 11l4.382-.002a2.73 2.73 0 0 0-.621 1.532l-.01.22v6.749c0 1.133.291 2.199.8 3.127A4.5 4.5 0 0 1 2 18.499V12.75A1.75 1.75 0 0 1 3.751 11m16.124-.002L24.25 11c.966 0 1.75.784 1.75 1.75v5.75a4.5 4.5 0 0 1-6.298 4.127l.056-.102c.429-.813.69-1.729.738-2.7l.008-.326V12.75c0-.666-.237-1.276-.63-1.752M14 3a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7m8.003 1a3 3 0 1 1 0 6a3 3 0 0 1 0-6M5.997 4a3 3 0 1 1 0 6a3 3 0 0 1 0-6" />
                </svg>
    }
          />
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
             <div className="workers-page__actions">
  
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
            <p className="workers-page__message">Loading workers...</p>
          ) : error ? (
            <p className="workers-page__message--error">Error: {error}</p>
          ) : filteredWorkers.length === 0 ? (
            <p className="workers-page__message">
              {searchTerm.trim() ? "No workers match your search." : "No workers found yet."}
            </p>
          ) : (
             <div className="workers-page__grid">
              {filteredWorkers.map((worker) => (
                <button
                  type="button"
                  key={`${worker.name}-${worker.email}`}
                  className="workers-page__card-button"
                  title={`View details for ${worker.name}`}
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