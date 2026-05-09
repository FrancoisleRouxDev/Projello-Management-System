import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function SingleProjectViewPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<any>(null);
  const navigate = useNavigate();
  useEffect(() => {
    if (id) {
      const token = localStorage.getItem("token");
      fetch(`http://localhost:5049/api/Projects/${id}`,
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      )
        .then(res => res.json())
        .then(data => setProject(data))
        .catch(() => setProject(null));
    }
  }, [id]);

  if (!project) return <h2>Loading project...</h2>;

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>&larr; Back</button>
      <h2>{project.name || project.Name}</h2>
      <p>{project.description || project.Description}</p>
    </div>
  );
}