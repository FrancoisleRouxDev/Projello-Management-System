
import React, { useState, useEffect } from "react";
import "./dashboard.css";
import BearLogo from "../../assets/Logo/SVG_Logo.svg";
import SearchIcon from "../../assets/Logo/SearchIcon.svg";
import JelloItem from "../../components/JelloItem";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  // Only one filter can be active at a time
  const [activeFilter, setActiveFilter] = useState<"az"|"priority"|"date"|"progress"|"workers"|null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:5049/api/Projects", {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
      },
    })
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized or error fetching projects");
        return res.json();
      })
      .then(data => setProjects(data))
      .catch(() => setProjects([]));
  }, []);


  const handleFilterChange = (key: "az"|"priority"|"date"|"progress"|"workers") => {
    setActiveFilter(key);
    // Add sorting logic here if needed
  };

  // Filter projects by search input (case-insensitive), only if search has at least 1 character
  const filteredProjects = search.trim().length > 0
    ? projects.filter((project) => {
        const name = (project.name || project.Name || "").trim().toLowerCase();
        const searchTerm = search.trim().toLowerCase();
        return name.includes(searchTerm);
      })
    : projects;

  return (
    <div className="dashboard-page">
      <div className="pageHeader">
        <img src={BearLogo} alt="Projello Logo" />
        <h3>Active Jellos</h3>
      </div>

      <div className="filterBar">
        <div className="searchBar">
          <img src={SearchIcon} alt="Search Icon" />
          <input
            type="text"
            placeholder="Search projects..."
            className="searchInput"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="sorter" id="AZsorter">
          <label className="radio-label">
            <input
              type="radio"
              name="filter"
              value="az"
              checked={activeFilter === "az"}
              onChange={() => handleFilterChange("az")}
            />
            <span className="custom-radio" />
            <span className="radio-text">Sort (A-Z)</span>
          </label>
        </div>
        <div className="sorter" id="prioritySorter">
          <label className="radio-label">
            <input
              type="radio"
              name="filter"
              value="priority"
              checked={activeFilter === "priority"}
              onChange={() => handleFilterChange("priority")}
            />
            <span className="custom-radio" />
            <span className="radio-text">Priority</span>
          </label>
        </div>
        <div className="sorter" id="dateSorter">
          <label className="radio-label">
            <input
              type="radio"
              name="filter"
              value="date"
              checked={activeFilter === "date"}
              onChange={() => handleFilterChange("date")}
            />
            <span className="custom-radio" />
            <span className="radio-text">Date</span>
          </label>
        </div>
        <div className="sorter" id="progressSorter">
          <label className="radio-label">
            <input
              type="radio"
              name="filter"
              value="progress"
              checked={activeFilter === "progress"}
              onChange={() => handleFilterChange("progress")}
            />
            <span className="custom-radio" />
            <span className="radio-text">Progress</span>
          </label>
        </div>
        <div className="sorter" id="activeWorkersSorter">
          <label className="radio-label">
            <input
              type="radio"
              name="filter"
              value="workers"
              checked={activeFilter === "workers"}
              onChange={() => handleFilterChange("workers")}
            />
            <span className="custom-radio" />
            <span className="radio-text">Workers</span>
          </label>
        </div>
      </div>

      <div className="jelloGallery-outer">
        <div className="jelloGallery">
          {filteredProjects.length === 0 ? (
            <p>No projects found.</p>
          ) : (
            filteredProjects.map((project) => (
              <JelloItem
                key={project.projectID || project.ProjectID}
                name={project.name || project.Name}
                clientName={project.client?.name || project.Client?.Name || "Unknown Client"}
                date={project.startDate || project.StartDate || ""}
                progressPercent={project.milestones ? Math.round((project.milestones.filter((m:any) => m.status === "Completed").length / project.milestones.length) * 100) : 0}
                milestonesLabel={project.milestones ? `${project.milestones.filter((m:any) => m.status === "Completed").length} / ${project.milestones.length} Milestones Reached` : "0 / 0 Milestones Reached"}
                workers={project.members ? project.members.length : 0}
                onClick={() => navigate(`/single-view/${project.projectID || project.ProjectID}`)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}