import React, { useState } from "react";
import { Button, Modal, Select } from "antd";
import { UserPlus } from "lucide-react";
import "./WorkerClientAddModal.css";

interface WorkerAddModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WorkerFormData) => void;
}

interface WorkerFormData {
  fullName: string;
  email: string;
  roleID: number;
  phone?: string;
}

export const WorkerAddModal: React.FC<WorkerAddModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<WorkerFormData>({
    fullName: "",
    email: "",
    roleID: 3,
    phone: "",
  });
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFormData({ fullName: "", email: "", roleID: 3, phone: "" });
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!formData.fullName.trim() || !formData.email.trim()) {
      alert("Please fill in name and email");
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      resetForm();
      onClose();
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
      className="entity-modal entity-modal--worker"
      width={680}
      title={
        <div className="entity-modal__title-row">
          <div className="entity-modal__title-icon" aria-hidden="true">
            <UserPlus size={18} strokeWidth={2.2} />
          </div>
          <div>
            <div className="entity-modal__title">Add New Worker</div>
            <div className="entity-modal__subtitle">Create a new team member</div>
          </div>
        </div>
      }
      footer={
        <div className="entity-modal__footer">
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            Add Worker
          </Button>
        </div>
      }
    >
      <div className="entity-modal__form">
        <div className="entity-modal__form-group">
          <label className="entity-modal__label entity-modal__label--required">Full Name</label>
          <input
            type="text"
            className="entity-modal__input"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="Enter full name"
          />
        </div>

        <div className="entity-modal__form-group">
          <label className="entity-modal__label entity-modal__label--required">Email</label>
          <input
            type="email"
            className="entity-modal__input"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email address"
          />
        </div>

        <div className="entity-modal__form-group">
          <label className="entity-modal__label">Role</label>
          <Select
            className="entity-modal__select"
            value={formData.roleID}
            onChange={(value) => setFormData({ ...formData, roleID: value })}
            options={[
              { label: "Worker", value: 3 },
              { label: "Foreman", value: 2 },
            ]}
          />
        </div>

        <div className="entity-modal__form-group">
          <label className="entity-modal__label">Phone</label>
          <input
            type="tel"
            className="entity-modal__input"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter phone number"
          />
        </div>
      </div>
    </Modal>
  );
};