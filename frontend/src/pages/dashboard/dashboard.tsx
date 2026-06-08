
import React, { useState, useEffect } from "react";
import "./dashboard.css";
// BearLogo import removed; now in SideNavBar
import SearchIcon from "../../assets/Logo/SearchIcon.svg";
import JelloItem from "../../components/JelloItem";
import { AddButton } from "../../components/AddButton";
import { ProjectAddModal } from "../../components/ProjectAddModal";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

interface ProjectFormData {
  name: string;
  description: string;
  clientName: string;
  dueDate?: string;
}

export default function DashboardPage() {
  const [sortOption, setSortOption] = useState<"az" | "date" | "workers">("az");
  const [projects, setProjects] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [showProjectAddModal, setShowProjectAddModal] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<number>(0);
  const [clientOptions, setClientOptions] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${API_BASE_URL}/api/Projects`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized or error fetching projects");
        return res.json();
      })
      .then((data) => setProjects(data))
      .catch(() => setProjects([]));

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const role = parseInt(payload.RoleID || payload["RoleID"] || "0", 10);
        setCurrentUserRole(role);
      } catch {
        setCurrentUserRole(0);
      }
    }

    if (token) {
      fetch(`${API_BASE_URL}/api/clients`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      })
        .then((res) => res.ok ? res.json() : Promise.reject())
        .then((data) => {
          const options = Array.isArray(data)
            ? data
                .map((client: any) => client.name || client.Name || "")
                .filter((name: string) => Boolean(name))
            : [];
          setClientOptions(options);
        })
        .catch(() => {
          // ignore client list fetch failure here
        });
    }
  }, []);

  const handleSortChange = (key: "az" | "date" | "workers") => {
    setSortOption(key);
    setShowSortModal(false);
  };

  const formatProjectName = (project: any) => (project.name || project.Name || "").trim();
  const getDueDateValue = (project: any) => project.dueDate || project.DueDate || "";
  const getProjectWorkers = (project: any) => project.members ? project.members.length : 0;

  const parseDueDate = (value: string) => {
    if (!value) return Number.MAX_SAFE_INTEGER;
    const date = new Date(value);
    return isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
  };

  const filteredProjects = projects.filter((project) => {
    // Exclude completed projects from dashboard
    if ((project.status || project.Status) === "Completed") {
      return false;
    }
    
    if (search.trim().length > 0) {
      const name = formatProjectName(project).toLowerCase();
      const searchTerm = search.trim().toLowerCase();
      return name.includes(searchTerm);
    }
    return true;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortOption === "az") {
      return formatProjectName(a).localeCompare(formatProjectName(b), undefined, { sensitivity: "base" });
    }

    if (sortOption === "date") {
      return parseDueDate(getDueDateValue(a)) - parseDueDate(getDueDateValue(b));
    }

    return getProjectWorkers(a) - getProjectWorkers(b);
  });

  const sortLabel = sortOption === "az" ? "A - Z" : sortOption === "date" ? "Due date" : "Worker count";
  const [showSortModal, setShowSortModal] = useState(false);

  const resolveClientId = async (clientName: string): Promise<number> => {
    const token = localStorage.getItem("token");
    const clientsResponse = await fetch(`${API_BASE_URL}/api/clients`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!clientsResponse.ok) {
      throw new Error("Unable to load clients for project creation.");
    }

    const clients = await clientsResponse.json();
    const normalizedClient = clientName.trim().toLowerCase();
    const existingClient = clients.find((client: any) =>
      (client.name || client.Name || "").trim().toLowerCase() === normalizedClient
    );

    if (existingClient) {
      return parseInt(existingClient.clientID || existingClient.ClientID || existingClient.clientId, 10);
    }

    const createResponse = await fetch(`${API_BASE_URL}/api/clients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        name: clientName.trim(),
        contactEmail: null,
        contactPhone: null,
        notes: null,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(errorText || "Unable to create a new client.");
    }

    const createdClient = await createResponse.json();
    return parseInt(createdClient.clientID || createdClient.ClientID || createdClient.clientId, 10);
  };

  const handleProjectSubmit = async (data: ProjectFormData) => {
    try {
      const token = localStorage.getItem("token");
      const clientId = await resolveClientId(data.clientName);
      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: data.name.trim(),
          description: data.description?.trim() || null,
          clientID: clientId,
          status: "Planning",
          dueDate: data.dueDate || null,
          startDate: null,
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to create project");
      }

      const createdProject = await response.json();
      setProjects((prev) => [createdProject, ...prev]);
      alert("Project created successfully!");
      setShowProjectAddModal(false);
    } catch (error: any) {
      alert(`Failed to create project: ${error.message || error}`);
    }
  };

  return (
    <div className="dashboard-page">
      {/* <div className="pageHeader">
        <h3>Active Jellos</h3>
      </div> */}

      <div className="filterBar">
        <div className="searchBar">
          <img src={SearchIcon} alt="Search Icon" />
          <input
            type="text"
            placeholder="Search projects..."
            className="searchInput"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="sortDropdownWrapper">
          <button
            type="button"
            className="sortDropdown"
            onClick={() => setShowSortModal(true)}
            aria-haspopup="dialog"
            aria-expanded={showSortModal}
          >
            <span className="sortDropdown__label">Sort</span>
            <span className="sortDropdown__selected">{sortLabel}</span>
          </button>

          {showSortModal && (
            <div
              className="sortDropdownModalMask"
              onClick={() => setShowSortModal(false)}
            >
              <div
                className="sortDropdownModal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sortDropdownModal__header">
                  <span className="sortDropdownModal__title">Sort projects</span>
                </div>
                <div className="sortDropdown__menu sortDropdown__menu--modal">
                  <label className="radio-label sortDropdown__option">
                    <input
                      type="radio"
                      name="dashboardSort"
                      value="az"
                      checked={sortOption === "az"}
                      onChange={() => handleSortChange("az")}
                    />
                    <span className="custom-radio" />
                    <span className="radio-text">A - Z</span>
                  </label>
                  <label className="radio-label sortDropdown__option">
                    <input
                      type="radio"
                      name="dashboardSort"
                      value="date"
                      checked={sortOption === "date"}
                      onChange={() => handleSortChange("date")}
                    />
                    <span className="custom-radio" />
                    <span className="radio-text">Due date</span>
                  </label>
                  <label className="radio-label sortDropdown__option">
                    <input
                      type="radio"
                      name="dashboardSort"
                      value="workers"
                      checked={sortOption === "workers"}
                      onChange={() => handleSortChange("workers")}
                    />
                    <span className="custom-radio" />
                    <span className="radio-text">Worker count</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="jelloGallery-outer">
        <div className="jelloGallery">
          {sortedProjects.length === 0 ? (
            <p>No projects found.</p>
          ) : (
            sortedProjects.map((project) => (
              <JelloItem
                key={project.projectID || project.ProjectID}
                name={project.name || project.Name}
                clientName={project.clientName || project.ClientName || "Unknown Client"}
                dueDate={project.dueDate || project.DueDate || ""}
                workers={project.members ? project.members.length : 0}
                onClick={() => navigate(`/single-view/${project.projectID || project.ProjectID}`)}
              />
            ))
          )}
        </div>
      </div>

      {[1, 4].includes(currentUserRole) && (
        <div className="dashboard-add-button">
          <AddButton label="Add Project" onClick={() => setShowProjectAddModal(true)} />
        </div>
      )}

      <ProjectAddModal
        open={showProjectAddModal}
        onClose={() => setShowProjectAddModal(false)}
        onSubmit={handleProjectSubmit}
        clientOptions={clientOptions}
      />
    </div>
  );
}