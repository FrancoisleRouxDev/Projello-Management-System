import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import HistoryPage from "./history";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockProjects = [
  {
    projectID: 10,
    name: "Cape Town Commercial Build",
    description: "Steel frame office block",
    clientName: "Atlantic Developers",
    status: "Completed",
    startDate: "2026-01-10T00:00:00Z",
    dueDate: "2026-05-28T00:00:00Z",
  },
  {
    projectID: 20,
    name: "Durban High-Bay Warehouse",
    description: "Logistics warehouse",
    clientName: "",
    status: "Archived",
    startDate: null,
    dueDate: null,
  },
  {
    projectID: 30,
    name: "Still Running Project",
    description: "Not finished yet",
    clientName: "Someone",
    status: "In Progress",
    startDate: null,
    dueDate: null,
  },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>
  );

describe("HistoryPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn() as jest.Mock;
  });

  test("shows a loader, then the completed and archived projects only", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockProjects });

    renderPage();

    expect(screen.getByText(/Compiling historical data arrays/i)).toBeInTheDocument();

    expect(await screen.findByText("Cape Town Commercial Build")).toBeInTheDocument();
    expect(screen.getByText("Durban High-Bay Warehouse")).toBeInTheDocument();
    expect(screen.queryByText("Still Running Project")).not.toBeInTheDocument();
    expect(screen.getByText(/Atlantic Developers/)).toBeInTheDocument();
    expect(screen.getByText(/Internal Account/)).toBeInTheDocument();
  });

  test("requests completed projects and sends the bearer token", async () => {
    localStorage.setItem("token", "abc123");
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async (): Promise<unknown[]> => [] });

    renderPage();

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(String(url)).toContain("/api/projects?status=Completed");
    expect(init.headers.Authorization).toBe("Bearer abc123");
  });

  test("shows an error banner when the server rejects the request", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 });

    renderPage();

    expect(await screen.findByText(/Security or Connection Interruption:/i)).toBeInTheDocument();
    expect(screen.getByText(/Archive retrieval failed with code: 401/i)).toBeInTheDocument();
  });

  test("shows the empty state when nothing is archived", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async (): Promise<unknown[]> => [] });

    renderPage();

    expect(await screen.findByText(/No completed or archived project rows/i)).toBeInTheDocument();
  });

  test("filters the archive client-side by name or description", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockProjects });

    renderPage();
    await screen.findByText("Cape Town Commercial Build");

    fireEvent.change(screen.getByPlaceholderText(/Filter archive/i), { target: { value: "warehouse" } });

    expect(screen.queryByText("Cape Town Commercial Build")).not.toBeInTheDocument();
    expect(screen.getByText("Durban High-Bay Warehouse")).toBeInTheDocument();
  });

  test("opens the single project view when a card is clicked", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockProjects });

    renderPage();
    fireEvent.click(await screen.findByText("Cape Town Commercial Build"));

    expect(mockNavigate).toHaveBeenCalledWith("/single-view/10");
  });
});
