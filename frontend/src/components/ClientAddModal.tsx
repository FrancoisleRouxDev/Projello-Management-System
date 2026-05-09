import React, { useState } from "react";
import CustomModal from "./CustomModal";
import { Button } from "antd";

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
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
            Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter client name"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d9d9d9",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
            Company *
          </label>
          <input
            type="text"
            value={formData.company}
            onChange={(e) =>
              setFormData({ ...formData, company: e.target.value })
            }
            placeholder="Enter company name"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d9d9d9",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="Enter email address"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d9d9d9",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            placeholder="Enter phone number"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d9d9d9",
              borderRadius: "6px",
              fontSize: "14px",
            }}
          />
        </div>
      </div>
    </CustomModal>
  );
};
