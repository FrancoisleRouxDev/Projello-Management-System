import {TextEncoder, TextDecoder} from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManagementPage from "./management";

// mock hooks and sub-comps
    const mockNavigate = jest.fn();
    jest.mock("react-router-dom", () => ({
        ...jest.requireActual("react-router-dom"),
        useNavigate: () => mockNavigate,
    }));

    // mock the inner views to keep this suite isolated to management page behavior
    jest.mock("./Clients", () => ({
        __esModule: true,
        default: () => <div data-testid="clients-view">Clients View</div>
    }));

    jest.mock("./Workers", () => ({
        __esModule: true,
        default: () => <div data-testid="workers-view">Workers View</div>
    }));

    // mocking atomic presentation comps
    jest.mock("../../components/ManagementTopNav", () => ({
    __esModule: true,
    default: ({ tabs, activeTab, onTabChange }: any) => (
        <nav data-testid="top-nav">
        {tabs.map((tab: any) => (
            <button
            key={tab.id}
            data-testid={`tab-${tab.id}`}
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => onTabChange(tab.id)}
            >
            {tab.label}
            </button>
        ))}
        </nav>
    ),
    }));

            jest.mock("../../components/ManagementClientTable", () => ({
            __esModule: true,
            default: ({ rows, onRowClick, onRowAction }: any) => (
                <table data-testid="projects-table">
                <tbody>
                    {rows.map((row: any) => (
                    <tr key={row.clientId} data-testid="project-row">
                        <td onClick={() => onRowClick(row)}>{row.initials}</td>
                        {/* Add a specific trigger for the action/modal */}
                        <td>
                            <button 
                                data-testid={`action-btn-${row.clientId}`} 
                                onClick={() => onRowAction(row)}
                            >
                                Edit
                            </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            ),
        }));
    // test specs

   describe("ManagementPage Component", () => {
    const mockProjects = [
        { projectID: 101, name: "Warehouse Construction", clientID: 5, status: "Active" },
        { projectID: 102, name: "Office Refurbishment", clientID: 9, status: "Completed" },
    ];
    const mockClientsLookup = [{ clientID: 5, name: "Build Corp" }, { clientID: 9, name: "Apex Industries" }];

    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        global.fetch = jest.fn().mockImplementation((url: string) => {
            if (url.includes("/api/projects/101/status")) return Promise.resolve({ ok: true });
            if (url.includes("/api/projects/101")) return Promise.resolve({ ok: true });
            if (url.includes("/api/projects")) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProjects) });
            if (url.includes("/api/clients")) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockClientsLookup) });
            if (url.includes("/api/workers")) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
            return Promise.reject(new Error(`Unhandled URL: ${url}`));
        });
    });

  it("renders loading initially and fetches project data successfully", async () => {
    render(<ManagementPage />);

    expect(screen.getByText(/Loading projects.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Loading projects.../i)).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("projects-table")).toBeInTheDocument();
    expect(screen.getByText("Warehouse Construction")).toBeInTheDocument();
    expect(screen.getByText("Office Refurbishment")).toBeInTheDocument();
  });

  it("correctly converts client names into compact uppercase initials", async () => {
    render(<ManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading projects.../i)).not.toBeInTheDocument();
    });

    // Build Corp -> BC, Apex Industries -> AI
    expect(screen.getByText("BC")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("navigates tabs reactively and displays corresponding sub-pages", async () => {
    render(<ManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading projects.../i)).not.toBeInTheDocument();
    });

    // Verify default view is projects
    expect(screen.getByText("Project Management")).toBeInTheDocument();

    // Navigate to Clients
    const clientsTab = screen.getByTestId("tab-clients");
    fireEvent.click(clientsTab);
    expect(screen.getByTestId("clients-view")).toBeInTheDocument();
    expect(screen.queryByText("Project Management")).not.toBeInTheDocument();

    // Navigate to Workers
    const workersTab = screen.getByTestId("tab-workers");
    fireEvent.click(workersTab);
    expect(screen.getByTestId("workers-view")).toBeInTheDocument();
    expect(screen.queryByTestId("clients-view")).not.toBeInTheDocument();
  });

 it("opens the project action modal upon row action", async () => {
    render(<ManagementPage />);
    await waitFor(() => {
        expect(screen.queryByText(/Loading projects.../i)).not.toBeInTheDocument();
    });

    const rows = screen.getAllByTestId("project-row");
    const actionBtn = screen.getByTestId(`action-btn-${mockProjects[0].projectID}`);
    fireEvent.click(actionBtn);

    expect(screen.getByText("Choose an action")).toBeInTheDocument(); 
    expect(screen.getByText("Edit Payments & Status")).toBeInTheDocument();
});

it("opens the project action modal when a row is clicked", async () => {
  render(<ManagementPage />);
  await waitFor(() => expect(screen.queryByText(/Loading projects.../i)).not.toBeInTheDocument());

  const rows = screen.getAllByTestId("project-row");
  fireEvent.click(rows[0]); // This triggers handleRowAction

  // Ensure the modal (or its content) is rendered
  expect(screen.getByText(/Choose an action/i)).toBeInTheDocument();
});

  it("displays fallback user messages if fetched dataset is empty", async () => {
    // Override fetch mock for this test case specifically
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    ) as jest.Mock;

    render(<ManagementPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading projects.../i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/No projects found./i)).toBeInTheDocument();
  });

    it("opens the project edit modal and allows editing payments", async () => {
    render(<ManagementPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.queryByText(/Loading projects.../i)).not.toBeInTheDocument();
    });

    const actionBtn = screen.getByTestId(`action-btn-${mockProjects[0].projectID}`);
    fireEvent.click(actionBtn);

    // Verify modal opened
    expect(screen.getByText("Warehouse Construction")).toBeInTheDocument();
    
    // Navigate to edit-payments
    fireEvent.click(screen.getByText(/Edit Payments & Status/i));
    
    // Check if input fields are present
    const totalPaidInput = screen.getByLabelText(/Total Paid/i);
    expect(totalPaidInput).toBeInTheDocument();

    // Simulate changing values
    fireEvent.change(totalPaidInput, { target: { value: '5000' } });
    expect(totalPaidInput).toHaveValue(5000);
  });

 it("handles API error during project update", async () => {
      // DO NOT reassign global.fetch. 
      // Instead, tell the existing mock to behave differently for this specific call:
      (global.fetch as jest.Mock).mockImplementationOnce((url) => {
          if (url.includes("/api/projects/101")) {
              return Promise.resolve({ ok: false, status: 500 });
          }
          // Default to returning success for other calls (like the initial load)
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockProjects) });
      });

      render(<ManagementPage />);
      
      // ... rest of your test remains the same
      const rows = await screen.findAllByTestId("project-row");
      fireEvent.click(rows[0]);
      fireEvent.click(screen.getByText(/Edit Payments & Status/i));
      
      fireEvent.click(screen.getByText(/Save Changes/i));

      await waitFor(() => {
          expect(screen.getByText(/Failed to update project/i)).toBeInTheDocument();
      });
  });
});