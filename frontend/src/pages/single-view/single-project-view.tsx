import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./single-project-view.css";
import SingleProjectNotFound from "../../components/SingleProjectNotFound";
import SingleProjectViewTemplate from "../../components/SingleProjectViewTemplate";
import { ProgressItem, ProjectViewData } from "../../components/SingleProjectViewTypes";
import { ProjectReadDto, MilestoneReadDto } from "../../../../backend/Projello.Api/DTOs";

const API_BASE_URL = "http://localhost:5049/api";

const formatDateValue = (dateValue?: string | null) => {
  if (!dateValue) return "N/A";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString();
};

const statusToPercent = (status: string): number => {
  switch ((status || "").toLowerCase()) {
    case "completed":       return 100;
    case "inprogress":
    case "in_progress":
    case "in progress":     return 50;
    case "blocked":         return 15;
    case "planning":        return 20;
    default:                return 0;
  }
};

const buildProgressBreakdown = (projectStatus: string, milestones: MilestoneReadDto[]): ProgressItem[] => {
  if (milestones.length === 0) {
    return [{ label: "Overall Completion", value: statusToPercent(projectStatus) }];
  }

  const milestoneItems = milestones.map((m) => ({
    label: m.title,
    value: statusToPercent(m.status),
  }));

  const overall = Math.round(milestoneItems.reduce((sum, item) => sum + item.value, 0) / milestoneItems.length);

  return [{ label: "Overall Completion", value: overall }, ...milestoneItems];
};

const mapToProjectViewData = (project: ProjectReadDto, milestones: MilestoneReadDto[]): ProjectViewData => {
  const progressBreakdown = buildProgressBreakdown(project.status, milestones);
  const overall = progressBreakdown.find((item) => item.label === "Overall Completion")?.value ?? 0;

  return {
    projectName: project.name,
    clientName: project.clientName,
    completion: overall,
    stats: [
      { label: "Project ID", value: String(project.projectID) },
      { label: "Status", value: project.status },
      { label: "Created", value: formatDateValue(project.createdAt) },
      { label: "Due Date", value: formatDateValue(project.dueDate) },
      { label: "Milestones", value: String(milestones.length) },
      { label: "Client", value: project.isClientBlacklisted ? "Blacklisted" : "Active" },
    ],
    projectDescription:
      project.description?.trim() ||
      `No description was provided for ${project.name}. Update this project in the backend to add a full summary.`,
    progressBreakdown,
    photoTiles: [],
  };
};

export default function SingleProjectViewPage() {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();

  const [project, setProject] = useState<ProjectViewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectForClient = async () => {
      if (!clientId) {
        setProject(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const projectResponse = await fetch(`${API_BASE_URL}/projects`, { headers });
        if (!projectResponse.ok) {
          const text = await projectResponse.text();
          throw new Error(text || projectResponse.statusText || "Failed to fetch projects");
        }

        const projects: ProjectReadDto[] = await projectResponse.json();
        const matchedProject = projects.find((p) => String(p.clientID) === clientId);

        if (!matchedProject) {
          setProject(null);
          return;
        }

        let milestones: MilestoneReadDto[] = [];
        const milestoneResponse = await fetch(`${API_BASE_URL}/projects/${matchedProject.projectID}/milestones`, { headers });
        if (milestoneResponse.ok) {
          milestones = await milestoneResponse.json();
        }

        setProject(mapToProjectViewData(matchedProject, milestones));
      } catch (err: any) {
        setError(err.message || "Failed to load project details");
      } finally {
        setLoading(false);
      }
    };

    fetchProjectForClient();
  }, [clientId]);

  if (loading) {
    return (
      <div className="single-project-view">
        <section className="single-project-view__panel" aria-label="Loading project">
          <h2 className="single-project-view__panel-title">Loading Project</h2>
          <p className="single-project-view__project-description">Fetching project data from the database...</p>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="single-project-view">
        <section className="single-project-view__panel" aria-label="Project loading error">
          <h2 className="single-project-view__panel-title">Unable To Load Project</h2>
          <p className="single-project-view__project-description">{error}</p>
          <button type="button" className="single-project-view__view-all-button" onClick={() => navigate("/management")}>Back To Clients</button>
        </section>
      </div>
    );
  }

  if (!project) {
    return <SingleProjectNotFound onBackToClients={() => navigate("/management")} />;
  }

  return <SingleProjectViewTemplate project={project} onBackToClients={() => navigate("/management")} />;
}