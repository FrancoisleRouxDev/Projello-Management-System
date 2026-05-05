import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./management.css";

const API_BASE_URL = "http://localhost:5049/api";

interface Project {
  projectID: number;
  name: string;
  description: string;
  clientID: number;
  clientName: string;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
}

export default function ManagementPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/projects`, {
          method: "GET",
          headers,
        });

        if (!response.ok) {
          throw new Error(`Status ${response.status}: ${response.statusText}`);
        }

        const data: Project[] = await response.json();
        console.log("All Projects Fetched:", data); // <--- CHECK THIS IN CONSOLE
        setProjects(data);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) return <div className="management-page"><div className="loading">Loading projects...</div></div>;
  if (error) return <div className="management-page"><div className="error">Error: {error}</div></div>;

  return (
    <div className="management-page">
      <div className="management-page__content">
        <h2>Project Management</h2>
        <table>
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Client</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={5}>No projects found.</td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr key={project.projectID}>
                  <td>{project.name}</td>
                  <td>{project.clientName}</td>
                  <td>{project.status}</td>
                  <td>{new Date(project.dueDate || "").toLocaleDateString()}</td>
                  <td>
                    <Link to={`/single-view/${project.projectID}`}>View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}