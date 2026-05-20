import React, { useState, useEffect } from "react";
import { API_BASE_URL } from "../config";

interface AddProjectMemberModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string | number;
  onMemberAdded?: () => void;
}

export default function AddProjectMemberModal({
  open,
  onClose,
  projectId,
  onMemberAdded,
}: AddProjectMemberModalProps) {
  const [workers, setWorkers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [assignedAs, setAssignedAs] = useState("Worker");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchAvailableWorkers();
  }, [open]);

  const fetchAvailableWorkers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      // Filter out Admins and already-added members (optional)
      setWorkers(data.filter((u: any) => u.roleID !== 1));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUserId) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          userID: selectedUserId,
          assignedAs: assignedAs,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      alert("Member added successfully!");
      onMemberAdded?.();
      onClose();
    } catch (err: any) {
      alert("Failed to add member: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="action-modal-overlay" onClick={onClose}>
      <div className="action-modal" onClick={e => e.stopPropagation()}>
        <div className="action-modal__header">
          <h3 className="action-modal__title">Add Team Member</h3>
          <button className="action-modal__close" onClick={onClose}>×</button>
        </div>

        <div className="action-modal__body">
          <select
            className="action-modal__input"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Select a worker...</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.fullName} — {w.email}
              </option>
            ))}
          </select>

          <select
            className="action-modal__input"
            value={assignedAs}
            onChange={(e) => setAssignedAs(e.target.value)}
          >
            <option value="Worker">Worker</option>
            <option value="Foreman">Foreman</option>
          </select>
        </div>

        <div className="action-modal__actions">
          <button
            className="action-modal__btn action-modal__btn--primary"
            onClick={handleSubmit}
            disabled={submitting || !selectedUserId}
          >
            {submitting ? "Adding..." : "Add to Project"}
          </button>
          <button className="action-modal__btn action-modal__btn--ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}