import React, { useState } from "react";
import { API_BASE_URL } from "../config";
import "./WorkerClientAddModal.css";

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
    <div className="client-add-modal">
      <div className="client-add-modal__content">
        <h2>Add New Client</h2>

       <form className="client-add-modal__form" onSubmit={handleSubmit}>
          <div className="client-add-modal__form-group">
            <label className="client-add-modal__label client-add-modal__label--required">
              Client Name
            </label>
            <input
              type="text"
              placeholder="Client Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="client-add-modal__input"
            />
          </div>

          <div className="client-add-modal__form-group">
            <label className="client-add-modal__label">Contact Email</label>
            <input
              type="email"
              placeholder="Contact Email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="client-add-modal__input"
            />
          </div>

          <div className="client-add-modal__form-group">
            <label className="client-add-modal__label">Contact Phone</label>
            <input
              type="text"
              placeholder="Contact Phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="client-add-modal__input"
            />
          </div>

          <div className="client-add-modal__form-group">
            <label className="client-add-modal__label">Notes</label>
            <textarea
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="client-add-modal__textarea"
            />
          </div>

          {error && <p className="client-add-modal__error">{error}</p>}

          <div className="client-add-modal__button-row">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="client-add-modal__cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="client-add-modal__submit-button"
            >
              {loading ? "Creating..." : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}