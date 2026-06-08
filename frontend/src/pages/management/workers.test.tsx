import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import WorkersPage from "./Workers";



// Mock child components to cleanly isolate our page behavior
jest.mock("../../components/StatCard", () => ({
  __esModule: true,
  default: ({ value, label }: any) => <div data-testid="stat-card" data-label={label}>{value}</div>
}));

jest.mock("../../components/SearchInput", () => ({
  __esModule: true,
  SearchInput: ({ onSearch, placeholder }: any) => (
    <input
      data-testid="search-input"
      placeholder={placeholder}
      onChange={(e) => onSearch(e.target.value)}
    />
  )
}));

jest.mock("../../components/WorkerCard", () => ({
  __esModule: true,
  default: ({ fullName, email }: any) => (
    <div data-testid="worker-card">
      <h3>{fullName}</h3> {/* <-- Changed from 'name' to 'fullName' to match API schema */}
      <span>{email}</span>
    </div>
  )
}));

jest.mock("../../components/AddButton", () => ({
  __esModule: true,
  AddButton: ({ label, onClick }: any) => <button onClick={onClick}>{label}</button>
}));

jest.mock("../../components/CustomModal", () => ({
  __esModule: true,
  default: ({ open, children, title, onCancel }: any) => (
    open ? (
      <div data-testid="custom-modal">
        <h2>{title}</h2>
        {children}
        <button onClick={onCancel}>Close</button>
      </div>
    ) : null
  )
}));

jest.mock("../../components/FilterButton", () => ({
  __esModule: true,
  FilterButton: () => <div data-testid="filter-btn" />
}));

jest.mock("../../components/SortButton", () => ({
  __esModule: true,
  SortButton: () => <div data-testid="sort-btn" />
}));

describe("WorkersPage Component", () => {
  const mockUsers = [
    { id: "1", fullName: "Admin user", email: "admin@test.com", roleID: 1, isTwoFactorEnabled: false },
    { id: "2", fullName: "Foreman Frank", email: "frank@test.com", roleID: 2, isTwoFactorEnabled: false, isOnline: true },
    { id: "3", fullName: "Worker Wally", email: "wally@test.com", roleID: 3, isTwoFactorEnabled: false, isOnline: false },
    { id: "4", fullName: "Owner Owen", email: "owen@test.com", roleID: 4, isTwoFactorEnabled: false, isOnline: true }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      })
    ) as jest.Mock;
  });

  const loginAsRole = (roleID: number) => {
    const header = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    const payload = btoa(JSON.stringify({ RoleID: roleID.toString() }));
    const signature = "dummy-signature";
    localStorage.setItem("token", `${header}.${payload}.${signature}`);
  };

  it("renders loading message initially and then populates workers excluding global Admins", async () => {
    render(<WorkersPage />);
    
    expect(screen.getByText(/Loading workers.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Loading workers.../i)).not.toBeInTheDocument();
    });

    const workerCards = screen.getAllByTestId("worker-card");
    expect(workerCards).toHaveLength(3); 
    
    // Using regex simplifies layout matching
    expect(screen.getByText(/Frank/i)).toBeInTheDocument();
    expect(screen.getByText(/Wally/i)).toBeInTheDocument();
  });

  it("correctly calculates and renders statistical metrics via StatCards", async () => {
    render(<WorkersPage />);

    await waitFor(() => {
      expect(screen.queryByText("Loading workers...")).not.toBeInTheDocument();
    });

    const statCards = screen.getAllByTestId("stat-card");
    
    const onlineCard = statCards.find(c => c.getAttribute("data-label") === "Online Workers");
    const foremenCard = statCards.find(c => c.getAttribute("data-label") === "Foremen");
    const workersCard = statCards.find(c => c.getAttribute("data-label") === "Workers");

    expect(onlineCard).toHaveTextContent("2");   
    expect(foremenCard).toHaveTextContent("1");  
    expect(workersCard).toHaveTextContent("1");  
  });

it("filters items reactively through user search input", async () => {
    render(<WorkersPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading workers.../i)).not.toBeInTheDocument();
    });

    const searchInput = screen.getByTestId("search-input");
    
    // Filter down to just 'Wally'
    fireEvent.change(searchInput, { target: { value: "Wally" } });

    expect(screen.getByText(/Wally/i)).toBeInTheDocument();
    expect(screen.queryByText(/Frank/i)).not.toBeInTheDocument();
  });
  
  it("displays the Generate Invite Code button for authorization roles", async () => {
    loginAsRole(2); 
    render(<WorkersPage />);

    await waitFor(() => {
      expect(screen.getByText("Generate Invite Code")).toBeInTheDocument();
    });
  });

  it("hides the Generate Invite Code action from standard workers", async () => {
    loginAsRole(3); 
    render(<WorkersPage />);

    await waitFor(() => {
      expect(screen.queryByText("Generate Invite Code")).not.toBeInTheDocument();
    });
  });

  it("opens up the invitation display modal when invite execution succeeds", async () => {
    loginAsRole(1); 
    
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.endsWith("/api/Auth/generate-invite")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ inviteCode: "PROJELLO-2026-X" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUsers),
      });
    }) as jest.Mock;

    render(<WorkersPage />);

    await waitFor(() => {
      expect(screen.getByText("Generate Invite Code")).toBeInTheDocument();
    });

    const inviteBtn = screen.getByText("Generate Invite Code");
    fireEvent.click(inviteBtn);

    await waitFor(() => {
      expect(screen.getByTestId("custom-modal")).toBeInTheDocument();
      expect(screen.getByText("Invite Code Generated")).toBeInTheDocument();
      expect(screen.getByText("PROJELLO-2026-X")).toBeInTheDocument();
    });
  });
});