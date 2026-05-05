import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./single-project-view.css";
import SingleProjectNotFound from "../../components/SingleProjectNotFound";
import SingleProjectViewTemplate from "../../components/SingleProjectViewTemplate";
import { ProgressItem, ProjectViewData } from "../../components/SingleProjectViewTypes";

/*
 * SingleProjectViewPage
 *
 * What it does:
 * - Loads one project view from backend data based on route param `clientId`.
 * - Calls GET /api/projects, finds the project that belongs to the client.
 * - Calls GET /api/projects/{projectId}/milestones for progress details.
 * - Maps backend DTOs to the UI model (`ProjectViewData`) used by the template component.
 *
 * How it works:
 * - Reads JWT token from localStorage and sends it as a Bearer token.
 * - Normalizes response casing (camelCase/PascalCase) in parser helpers.
 * - Computes an overall completion percentage from milestone/project status.
 * - Renders loading, error, not-found, or the final project template.
 */

type ProjectReadDto = {
  projectID: number;
  name: string;
  description?: string | null;
  status: string;
  dueDate?: string | null;
  createdAt: string;
  clientID: number;
  clientName: string;
  isClientBlacklisted: boolean;
};

type MilestoneReadDto = {
  milestoneID: number;
  title: string;
  status: string;
};

const API_BASE_URL = "http://localhost:5049/api";

// Normalize project DTO casing differences from backend responses.
const parseProjectDto = (raw: any): ProjectReadDto => ({
  projectID: raw.projectID ?? raw.ProjectID,
  name: raw.name ?? raw.Name,
  description: raw.description ?? raw.Description,
  status: raw.status ?? raw.Status,
  dueDate: raw.dueDate ?? raw.DueDate,
  createdAt: raw.createdAt ?? raw.CreatedAt,
  clientID: raw.clientID ?? raw.ClientID,
  clientName: raw.clientName ?? raw.ClientName,
  isClientBlacklisted: raw.isClientBlacklisted ?? raw.IsClientBlacklisted,
});

// Normalize milestone DTO casing differences from backend responses.
const parseMilestoneDto = (raw: any): MilestoneReadDto => ({
  milestoneID: raw.milestoneID ?? raw.MilestoneID,
  title: raw.title ?? raw.Title,
  status: raw.status ?? raw.Status,
});

const formatDateValue = (dateValue?: string | null) => {
  if (!dateValue) return "N/A";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString();
};

// Convert backend workflow status strings into approximate completion percentages.
const statusToPercent = (status: string): number => {
  switch ((status || "").toLowerCase()) {
    case "completed":
      return 100;
    case "inprogress":
    case "in_progress":
    case "in progress":
      return 50;
    case "blocked":
      return 15;
    case "planning":
      return 20;
    default:
      return 0;
  }
};

// Build progress rows for the UI; if no milestones exist, fallback to project status.
const buildProgressBreakdown = (projectStatus: string, milestones: MilestoneReadDto[]): ProgressItem[] => {
  if (milestones.length === 0) {
    const overall = statusToPercent(projectStatus);
    return [{ label: "Overall Completion", value: overall }];
  }

  const milestoneItems = milestones.map((m) => ({
    label: m.title,
    value: statusToPercent(m.status),
  }));

  const total = milestoneItems.reduce((sum, item) => sum + item.value, 0);
  const overall = Math.round(total / milestoneItems.length);

  return [{ label: "Overall Completion", value: overall }, ...milestoneItems];
};

// Map raw API data to the view model expected by `SingleProjectViewTemplate`.
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
    // Fetch project + milestones whenever the route client id changes.
    const fetchProjectForClient = async () => {
      if (!clientId) {
        setProject(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // JWT added when available; API endpoints are authenticated.
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        // Step 1: fetch all visible projects and find one for this client.
        const projectResponse = await fetch(`${API_BASE_URL}/projects`, { headers });
        if (!projectResponse.ok) {
          const text = await projectResponse.text();
          throw new Error(text || projectResponse.statusText || "Failed to fetch projects");
        }

        const rawProjects = await projectResponse.json();
        const projects: ProjectReadDto[] = (rawProjects ?? []).map(parseProjectDto);
        const matchedProject = projects.find((p) => String(p.clientID) === clientId);

        if (!matchedProject) {
          setProject(null);
          return;
        }

        // Step 2: fetch milestones for this project (used to build progress bars).
        let milestones: MilestoneReadDto[] = [];
        const milestoneResponse = await fetch(`${API_BASE_URL}/projects/${matchedProject.projectID}/milestones`, { headers });
        if (milestoneResponse.ok) {
          const rawMilestones = await milestoneResponse.json();
          milestones = (rawMilestones ?? []).map(parseMilestoneDto);
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

  // Render state: initial loading while fetching.
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

  // Render state: request failed or backend is unavailable/unauthorized.
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

  // Render state: route is valid but no project exists for the provided client id.
  if (!project) {
    return <SingleProjectNotFound onBackToClients={() => navigate("/management")} />;
  }

  return <SingleProjectViewTemplate project={project} onBackToClients={() => navigate("/management")} />;
}