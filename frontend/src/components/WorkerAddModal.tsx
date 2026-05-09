import React, { useState } from "react";
import CustomModal from "./CustomModal";
import { Button, Select } from "antd";
import "./WorkerAddModal.css";

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

  const handleSubmit = () => {
    if (!formData.fullName.trim() || !formData.email.trim()) {
      alert("Please fill in name and email");
      return;
    }
    onSubmit(formData);
    setFormData({ fullName: "", email: "", roleID: 3, phone: "" });
    onClose();
  };

  const handleCancel = () => {
    setFormData({ fullName: "", email: "", roleID: 3, phone: "" });
    onClose();
  };

  return (
    <CustomModal
      open={open}
      onCancel={handleCancel}
      title="Add New Worker"
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          Add Worker
        </Button>,
      ]}
    >
      <div className="worker-add-modal__form">
        <div className="worker-add-modal__form-group">
          <label className="worker-add-modal__label worker-add-modal__label--required">
            Full Name
          </label>
          <input
            type="text"
            className="worker-add-modal__input"
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            placeholder="Enter full name"
          />
        </div>
        <div className="worker-add-modal__form-group">
          <label className="worker-add-modal__label worker-add-modal__label--required">
            Email
          </label>
          <input
            type="email"
            className="worker-add-modal__input"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="Enter email address"
          />
        </div>
        <div className="worker-add-modal__form-group">
          <label className="worker-add-modal__label">
            Role
          </label>
          <Select
            className="worker-add-modal__select"
            value={formData.roleID}
            onChange={(value) => setFormData({ ...formData, roleID: value })}
            options={[
              { label: "Worker", value: 3 },
              { label: "Foreman", value: 2 },
            ]}
          />
        </div>
        <div className="worker-add-modal__form-group">
          <label className="worker-add-modal__label">
            Phone
          </label>
          <input
            type="tel"
            className="worker-add-modal__input"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="Enter phone number"
          />
        </div>
      </div>
    </CustomModal>
  );
};
