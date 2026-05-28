import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import HistoryPage from "./history";
import { API_BASE_URL } from "../../config";

// --- Mock Data Payloads ---
const mockUpdates = [
  {
    updateID: 101,
    milestoneID: 1,
    milestoneTitle: "Foundations Concrete",
    projectID: 10,
    projectName: "Cape Town Commercial Build",
    userID: "usr-admin",
    userFullName: "Francois le Roux",
    optionalComment: "Completed Phase 1 framework grid layout.",
    updateDate: "2026-05-28T12:00:00Z",
    createdAt: "2026-05-28T12:00:00Z",
    reactions: [
      { reactionID: 1, updateID: 101, userID: "usr-worker", emoji: "👍" }
    ]
  },
  {
    updateID: 102,
    milestoneID: 2,
    milestoneTitle: "Excavation Works",
    projectID: 20,
    projectName: "Durban High-Bay Warehouse",
    userID: "usr-foreman",
    userFullName: "David Golding",
    optionalComment: "Encountered shallow rock layers during trenching.",
    updateDate: "2026-05-27T14:30:00Z",
    createdAt: "2026-05-27T14:30:00Z",
    reactions: []
  }
];

const mockCompletedProjects = [
  {
    projectID: 50,
    name: "Pretoria Retail Center",
    description: "Façade upgrade and structural repairs for retail plaza.",
    startDate: "2026-01-10",
    dueDate: "2026-04-15",
    status: "Completed",
    clientName: "William Basson Assets"
  }
];

// --- Web API Fetch Call Interceptors ---
beforeEach(() => {
  localStorage.setItem("token", "mocked-jwt-security-token");
  
  // Safeguard Electron Node-mock environment by initializing a fetch property stub if missing
  if (!global.fetch) {
    global.fetch = jest.fn();
  } else {
    global.fetch = jest.fn(global.fetch);
  }
  
  jest.spyOn(global, "fetch");
});

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
  
  if (jest.isMockFunction(global.fetch)) {
    (global.fetch as jest.Mock).mockReset();
  }
});

describe("HistoryPage Component - Core Integration Testing", () => {
  
  test("renders loading state initially and transitions to data display", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdates,
    });

    render(<HistoryPage />);

    // Assert skeleton loader appears
    expect(screen.getByText(/Compiling historical data arrays/i)).toBeInTheDocument();

    // Wait for the asynchronous fetch pipeline to fill states
    await waitFor(() => {
      expect(screen.getByText("Francois le Roux")).toBeInTheDocument();
    });

    expect(screen.getByText(/"Completed Phase 1 framework grid layout."/)).toBeInTheDocument();
    
    // FIXED: Using getAllByText to assert that multiple components rendering the name are safely mounted
    expect(screen.getAllByText("Cape Town Commercial Build")[0]).toBeInTheDocument();
  });

  test("handles authorization or network server connection failures gracefully", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    render(<HistoryPage />);

    await waitFor(() => {
      expect(screen.getByText(/Security or Connection Interruption:/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Daily Log sync failed with code: 401/i)).toBeInTheDocument();
  });

  test("allows interactive switching between live stream and archived completed projects", async () => {
    // 1st Fetch: Load initial log stream
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdates,
    });
    // 2nd Fetch: Load archive when clicking archive tab
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCompletedProjects,
    });

    render(<HistoryPage />);

    // Wait for initial load
    await screen.findByText("Francois le Roux");

    // Click the Archive Tab
    const archiveTabButton = screen.getByRole("button", { name: /Completed Projects Archive/i });
    fireEvent.click(archiveTabButton);

    // Verify loading state changes to archive dataset
    await waitFor(() => {
      expect(screen.getByText("Pretoria Retail Center")).toBeInTheDocument();
    });
    expect(screen.getByText("Client Account: William Basson Assets")).toBeInTheDocument();
    expect(screen.queryByText("Francois le Roux")).not.toBeInTheDocument();
  });

  test("filters timeline entries client-side using the search bar input engine", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdates,
    });

    render(<HistoryPage />);
    await screen.findByText("Francois le Roux");

    const searchInput = screen.getByPlaceholderText(/Search logs by username/i);
    
    // Type 'David' to filter out 'Francois'
    fireEvent.change(searchInput, { target: { value: "David" } });

    expect(screen.getByText("David Golding")).toBeInTheDocument();
    expect(screen.queryByText("Francois le Roux")).not.toBeInTheDocument();
  });

  test("posts structural reaction payloads to the corrected plural backend route", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdates,
      }) // Initial render load
      .mockResolvedValueOnce({
        ok: true,
      }) // Post reaction action
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUpdates,
      }); // Automated tracking re-fetch loop

    render(<HistoryPage />);
    
    // Find specific card module container
    const cardElement = await screen.findByText("Francois le Roux");
    const historyCard = cardElement.closest(".history-card");
    expect(historyCard).toBeInTheDocument();

    // Click the Fire reaction button inside this specific card element
    const fireButton = within(historyCard as HTMLElement).getByTitle("Tag status as 🔥");
    fireEvent.click(fireButton);

    // Assert it hits the strict endpoint route path containing plural /reactions suffix
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${API_BASE_URL}/api/updates/101/reactions`),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ emoji: "🔥" })
        })
      );
    });
  });
});