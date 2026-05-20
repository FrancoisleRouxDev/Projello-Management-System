import React, { useState } from "react";
import { API_BASE_URL } from "../config";

interface ClientAddModalProps {
  open: boolean;
  onClose: () => void;
  onClientAdded: () => void; // Refresh the list after adding
}

export default function ClientAddModal({ open, onClose, onClientAdded }: ClientAddModalProps) {
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Client name is required.");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE_URL}/api/clients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create client");
      }

      // Success
      onClientAdded(); // Refresh the list in parent
      onClose();

      // Reset form
      setName("");
      setContactEmail("");
      setContactPhone("");
      setNotes("");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div style={{
        background: "white", padding: "30px", borderRadius: "12px",
        width: "450px", maxWidth: "90%"
      }}>
        <h2 style={{ marginTop: 0 }}>Add New Client</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Client Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%", padding: "10px", marginBottom: "12px" }}
          />

          <input
            type="email"
            placeholder="Contact Email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            style={{ width: "100%", padding: "10px", marginBottom: "12px" }}
          />

          <input
            type="text"
            placeholder="Contact Phone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            style={{ width: "100%", padding: "10px", marginBottom: "12px" }}
          />

          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "10px", marginBottom: "12px" }}
          />

          {error && <p style={{ color: "red", marginBottom: "10px" }}>{error}</p>}

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{ padding: "10px 20px" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: "10px 20px", background: "#3b82f6", color: "white", border: "none" }}
            >
              {loading ? "Creating..." : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}