import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./single-project-view.css";
import SingleProjectNotFound from "../../components/SingleProjectNotFound";
import SingleProjectViewTemplate from "../../components/SingleProjectViewTemplate";
import { ProgressItem, ProjectViewData } from "../../components/SingleProjectViewTypes";

/*
 * SingleProjectViewPage
 * - Reads `clientId` from route: /single-view/:clientId
 * - Looks up project details from a temporary local dataset
 * - Renders a reusable template component when data exists
 * - Renders a not-found fallback when id is missing/unknown
 *
 * Replace `CLIENT_PROJECT_DATA` with backend calls once project endpoints are wired.
 */

const DEFAULT_PROGRESS: ProgressItem[] = [
  { label: "Overall Completion", value: 68 },
  { label: "Planning", value: 100 },
  { label: "Design", value: 100 },
  { label: "Foundation", value: 100 },
  { label: "Structure", value: 85 },
  { label: "Electrical", value: 80 },
  { label: "Plumbing", value: 55 },
  { label: "Finishing", value: 20 },
];

// Temporary placeholder dataset keyed by client id until backend project endpoints are connected.
// Keep keys aligned with the id used in the clients page navigation.
const CLIENT_PROJECT_DATA: Record<string, ProjectViewData> = {
  "james-walker": {
    projectName: "RiverStone",
    clientName: "Walker & Co.",
    completion: 68,
    stats: [
      { label: "Workers", value: "140" },
      { label: "Under Budget", value: "R3M" },
      { label: "Injuries", value: "0" },
      { label: "Timeline", value: "Jun 2025 - Nov 2026" },
      { label: "Location", value: "Gauteng, SA" },
    ],
    projectDescription:
      "Riverstone Apartments Phase 2 is a R348 million residential development in Gauteng for Walker & Co. It started in June 2025, with planned completion by November 2026. The site currently has about 140 workers daily, zero lost-time injuries reported, and the project is running roughly R3 million under budget so far.",
    progressBreakdown: DEFAULT_PROGRESS,
    photoTiles: ["site-1", "site-2", "site-3", "site-4"],
  },
  "sam-vice": {
    projectName: "Harbor Point",
    clientName: "Zyntra Labs",
    completion: 54,
    stats: [
      { label: "Workers", value: "86" },
      { label: "Under Budget", value: "R800k" },
      { label: "Injuries", value: "1" },
      { label: "Timeline", value: "Mar 2025 - Feb 2026" },
      { label: "Location", value: "Durban, SA" },
    ],
    projectDescription:
      "Harbor Point is a mixed-use build for Zyntra Labs focused on phased delivery. Structural and electrical packages are progressing steadily while finishing work begins next quarter.",
    progressBreakdown: [
      { label: "Overall Completion", value: 54 },
      { label: "Planning", value: 100 },
      { label: "Design", value: 92 },
      { label: "Foundation", value: 100 },
      { label: "Structure", value: 70 },
      { label: "Electrical", value: 52 },
      { label: "Plumbing", value: 41 },
      { label: "Finishing", value: 12 },
    ],
    photoTiles: ["site-1", "site-2", "site-3", "site-4"],
  },
  "christian-simpson": {
    projectName: "Westline Towers",
    clientName: "Veimore",
    completion: 73,
    stats: [
      { label: "Workers", value: "103" },
      { label: "Under Budget", value: "R1.2M" },
      { label: "Injuries", value: "0" },
      { label: "Timeline", value: "Jan 2025 - Oct 2026" },
      { label: "Location", value: "Cape Town, SA" },
    ],
    projectDescription:
      "Westline Towers is advancing through major envelope and services milestones, with high schedule confidence and strong cost control performance.",
    progressBreakdown: [
      { label: "Overall Completion", value: 73 },
      { label: "Planning", value: 100 },
      { label: "Design", value: 100 },
      { label: "Foundation", value: 100 },
      { label: "Structure", value: 90 },
      { label: "Electrical", value: 82 },
      { label: "Plumbing", value: 68 },
      { label: "Finishing", value: 35 },
    ],
    photoTiles: ["site-1", "site-2", "site-3", "site-4"],
  },
  "lily-louwe": {
    projectName: "Luma Square",
    clientName: "Luma",
    completion: 61,
    stats: [
      { label: "Workers", value: "92" },
      { label: "Under Budget", value: "R650k" },
      { label: "Injuries", value: "0" },
      { label: "Timeline", value: "Apr 2025 - Dec 2026" },
      { label: "Location", value: "Pretoria, SA" },
    ],
    projectDescription:
      "Luma Square is a residential-and-retail project currently transitioning from core structure completion into interior trades and fit-out sequencing.",
    progressBreakdown: [
      { label: "Overall Completion", value: 61 },
      { label: "Planning", value: 100 },
      { label: "Design", value: 100 },
      { label: "Foundation", value: 100 },
      { label: "Structure", value: 84 },
      { label: "Electrical", value: 63 },
      { label: "Plumbing", value: 48 },
      { label: "Finishing", value: 20 },
    ],
    photoTiles: ["site-1", "site-2", "site-3", "site-4"],
  },
  "willow-du-plessis": {
    projectName: "Oryn Heights",
    clientName: "Oryn Collective",
    completion: 39,
    stats: [
      { label: "Workers", value: "74" },
      { label: "Under Budget", value: "R220k" },
      { label: "Injuries", value: "2" },
      { label: "Timeline", value: "Aug 2025 - Mar 2027" },
      { label: "Location", value: "Johannesburg, SA" },
    ],
    projectDescription:
      "Oryn Heights is in early-to-mid delivery with civil and structural work active on multiple zones. Current focus is on productivity stabilization and subcontractor ramp-up.",
    progressBreakdown: [
      { label: "Overall Completion", value: 39 },
      { label: "Planning", value: 100 },
      { label: "Design", value: 80 },
      { label: "Foundation", value: 62 },
      { label: "Structure", value: 40 },
      { label: "Electrical", value: 25 },
      { label: "Plumbing", value: 18 },
      { label: "Finishing", value: 4 },
    ],
    photoTiles: ["site-1", "site-2", "site-3", "site-4"],
  },
};

export default function SingleProjectViewPage() {
  const navigate = useNavigate();
  // `clientId` is supplied by React Router from the URL.
  const { clientId } = useParams<{ clientId: string }>();
  // Local lookup for now; this will become API-driven (fetch by id or filter projects by client).
  const project = clientId ? CLIENT_PROJECT_DATA[clientId] : undefined;

  // Guard path: unknown ids route users back with a clear not-found state.
  if (!project) {
    return <SingleProjectNotFound onBackToClients={() => navigate("/management")} />;
  }

  // Happy path: delegate rendering to the reusable single-project template component.
  return <SingleProjectViewTemplate project={project} onBackToClients={() => navigate("/management")} />;
}