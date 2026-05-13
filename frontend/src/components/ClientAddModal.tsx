import React, { useState } from "react";
import CustomModal from "./CustomModal";
import { Button } from "antd";
import "./ClientAddModal.css";

interface ClientAddModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ClientFormData) => void;
}

interface ClientFormData {
  name: string;
  company: string;
  email: string;
  phone?: string;
}

export const ClientAddModal: React.FC<ClientAddModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<ClientFormData>({
    name: "",
    company: "",
    email: "",
    phone: "",
  });

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.company.trim() || !formData.email.trim()) {
      alert("Please fill in name, company, and email");
      return;
    }
    onSubmit(formData);
    setFormData({ name: "", company: "", email: "", phone: "" });
    onClose();
  };

  const handleCancel = () => {
    setFormData({ name: "", company: "", email: "", phone: "" });
    onClose();
  };

  return (
    <CustomModal
      open={open}
      onCancel={handleCancel}
      title="Add New Client"
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          Add Client
        </Button>,
      ]}
    >
      <div className="client-add-modal__form">
        <div className="client-add-modal__form-group">
          <label className="client-add-modal__label client-add-modal__label--required">
            Name
          </label>
          <input
            type="text"
            className="client-add-modal__input"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter client name"
          />
        </div>
        <div className="client-add-modal__form-group">
          <label className="client-add-modal__label client-add-modal__label--required">
            Company
          </label>
          <input
            type="text"
            className="client-add-modal__input"
            value={formData.company}
            onChange={(e) =>
              setFormData({ ...formData, company: e.target.value })
            }
            placeholder="Enter company name"
          />
        </div>
        <div className="client-add-modal__form-group">
          <label className="client-add-modal__label client-add-modal__label--required">
            Email
          </label>
          <input
            type="email"
            className="client-add-modal__input"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="Enter email address"
          />
        </div>
        <div className="client-add-modal__form-group">
          <label className="client-add-modal__label">
            Phone
          </label>
          <input
            type="tel"
            className="client-add-modal__input"
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
