import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate, useParams } from 'react-router-dom';
import SingleProjectViewPage from './single-project-view';

// Mock fetch API
global.fetch = jest.fn();

// Mock useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockProject = {
  projectID: 1,
  name: 'Test Project',
  description: 'This is a test description',
  clientID: 101,
  clientName: 'Test Client',
  status: 'In Progress',
  startDate: '2024-01-01',
  dueDate: '2024-12-31',
  createdAt: '2024-01-01T00:00:00Z',
};

describe('SingleProjectViewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useParams as jest.Mock).mockReturnValue({ projectId: '1' });
  });

  it('renders loading state initially', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/projects/1', search: '' }]}>
        <SingleProjectViewPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading project/i)).toBeInTheDocument();
  });

  it('displays project data after fetching', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProject,
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/projects/1', search: '' }]}>
        <SingleProjectViewPage />
      </MemoryRouter>
    );

    // Wait for loading to disappear
    await waitFor(() => {
      expect(screen.queryByText(/loading project/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test Client')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Project ID
    expect(screen.getByText(/no description provided/i)).toBeInTheDocument(); // Fallback if description is empty
  });

  it('handles missing project ID', async () => {
    (useParams as jest.Mock).mockReturnValue({ projectId: undefined });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/projects/', search: '' }]}>
        <SingleProjectViewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/project id is missing/i)).toBeInTheDocument();
    });
  });

  it('handles invalid project ID', async () => {
    (useParams as jest.Mock).mockReturnValue({ projectId: 'abc' });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/projects/abc', search: '' }]}>
        <SingleProjectViewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/invalid project id/i)).toBeInTheDocument();
    });
  });

  it('renders back button', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProject,
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/projects/1', search: '' }]}>
        <SingleProjectViewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading project/i)).not.toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /←/i });
    expect(backButton).toBeInTheDocument();
  });
});