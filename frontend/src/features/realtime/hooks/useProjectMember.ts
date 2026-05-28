// frontend/src/features/realtime/hooks/useProjectMember.ts
import { useState, useEffect } from "react";
import { API_BASE_URL } from '../../../config';

export interface TeamMember {
  UserID: string;
  FullName: string;
  AssignedAs: string;
}

export function useProjectMember(projectId: string | number) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!projectId) {
        setMembers([]);
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
          method: "GET",
          headers,
        });

        if (!res.ok) {
          console.warn(`Failed to fetch project ${projectId}`);
          setMembers([]);
          return;
        }

        const projectData = await res.json();
        
        console.log("🔍 Full Project Data:", projectData);           // ← Important
        console.log("🔍 Members field?", projectData.members);
        console.log("🔍 Members field (capital M)?", projectData.Members);

        // Try different possible property names
        const memberList = projectData.members ||
                   projectData.Members ||
                   projectData.projectMembers ||
                   projectData.ProjectMembers ||
                   [];

        // Normalize common id/name fields so callers can rely on `UserID`, `FullName`, `AssignedAs`
        const normalized = (memberList as any[]).map(m => ({
          // pick a canonical id from possible variants
          UserID: m.UserID ?? m.userID ?? m.userId ?? m.id ?? m.user?.id ?? "",
          FullName: m.FullName ?? m.fullName ?? m.user?.fullName ?? m.user?.full_name ?? "",
          AssignedAs: m.AssignedAs ?? m.assignedAs ?? m.Assigned_as ?? "Worker",
          // include original object so other props remain available
          ...m
        }));

        setMembers(normalized);

      } catch (err) {
        console.error("Error fetching project members:", err);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [projectId]);

  return { members, loading };
}