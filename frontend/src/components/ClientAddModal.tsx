import React, { useState } from "react";
import { Button, Modal } from "antd";
import { API_BASE_URL } from "../config";
import "./WorkerClientAddModal.css";
import { PlusCircle } from "lucide-react";

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

  const resetForm = () => {
    setName("");
    setContactEmail("");
    setContactPhone("");
    setNotes("");
    setError("");
  };

  const handleClose = () => {
    if (loading) return; // Prevent closing while loading
    resetForm();
    onClose();
  };

  // if (!open) return null;

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

    await onClientAdded(); // Refresh the list in parent
    resetForm();
    onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

   return (
    <Modal
      open={open}
      onCancel={handleClose}
      centered
      destroyOnClose
      maskClosable={!loading}
      className="entity-modal entity-modal--client"
      width={680}
      title="Add New Client"
      footer={
        <div className="entity-modal__footer">
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleSubmit as any} loading={loading}>
            {loading ? "Creating..." : "Create Client"}
          </Button>
        </div>
      }
    >
      <form className="entity-modal__form" onSubmit={handleSubmit}>
        <div className="entity-modal__form-group">
          <label className="entity-modal__label entity-modal__label--required">Client Name</label>
          <input
            type="text"
            placeholder="Client Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="entity-modal__input"
            required
          />
        </div>

        <div className="entity-modal__form-group">
          <label className="entity-modal__label">Contact Email</label>
          <input
            type="email"
            placeholder="Contact Email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="entity-modal__input"
          />
        </div>

        <div className="entity-modal__form-group">
          <label className="entity-modal__label">Contact Phone</label>
          <input
            type="text"
            placeholder="Contact Phone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="entity-modal__input"
          />
        </div>

        <div className="entity-modal__form-group">
          <label className="entity-modal__label">Notes</label>
          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="entity-modal__textarea"
          />
        </div>

        {error && <p className="entity-modal__error">{error}</p>}

      </form>
    </Modal>
  );
}