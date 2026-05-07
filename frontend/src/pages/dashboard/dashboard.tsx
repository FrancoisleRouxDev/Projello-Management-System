import React, { useState, useEffect } from "react";
import "./dashboard.css";
import BearLogo from "../../assets/Logo/SVG_Logo.svg";
import SearchIcon from "../../assets/Logo/SearchIcon.svg";
import SortArrow from "../../assets/Logo/SortArrow.svg";
import JelloItem from "../../components/JelloItem";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
const [flipped, setFlipped] = useState({
    az: false,
    priority: false,
    date: false,
    progress: false,
    workers: false,
  });
  const [projects, setProjects] = useState<any[]>([]);
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

  const handleFlip = (key: keyof typeof flipped) => {
    setFlipped((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="dashboard-page">
      <div className="pageHeader">
        <img src={BearLogo} alt="Projello Logo" />
        <h3>Active Jellos</h3>
      </div>

      <div className="filterBar">
        <div className="searchBar">
          <img src={SearchIcon} alt="Search Icon" />
          <input type="text" placeholder="Search projects..." className="searchInput"/>
        </div>
        <div className="sorter" id="AZsorter">
          <h5>Sort (A-Z)</h5>
          <img
            src={SortArrow}
            alt="Sort Arrow"
            className={flipped.az ? "sort-arrow flipped" : "sort-arrow"}
            onClick={() => handleFlip("az")}
          />
        </div>
        <div className="sorter" id="prioritySorter">
          <h5>Priority</h5>
          <img
            src={SortArrow}
            alt="Sort Arrow"
            className={flipped.priority ? "sort-arrow flipped" : "sort-arrow"}
            onClick={() => handleFlip("priority")}
          />
        </div>
        <div className="sorter" id="dateSorter">
          <h5>Date</h5>
          <img
            src={SortArrow}
            alt="Sort Arrow"
            className={flipped.date ? "sort-arrow flipped" : "sort-arrow"}
            onClick={() => handleFlip("date")}
          />
        </div>
        <div className="sorter" id="progressSorter">
          <h5>Progress</h5>
          <img
            src={SortArrow}
            alt="Sort Arrow"
            className={flipped.progress ? "sort-arrow flipped" : "sort-arrow"}
            onClick={() => handleFlip("progress")}
          />
        </div>
        <div className="sorter" id="activeWorkersSorter">
          <h5>Workers</h5>
          <img
            src={SortArrow}
            alt="Sort Arrow"
            className={flipped.workers ? "sort-arrow flipped" : "sort-arrow"}
            onClick={() => handleFlip("workers")}
          />
        </div>
      </div>

      <div className="jelloGallery-outer">
        <div className="jelloGallery">
          {projects.length === 0 ? (
            <p>No projects found.</p>
          ) : (
            projects.map((project) => (
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