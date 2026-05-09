import React, { useState } from "react";
import CustomModal from "./CustomModal";
import { Button, Select } from "antd";

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
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
            Full Name *
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            placeholder="Enter full name"
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
            Role
          </label>
          <Select
            value={formData.roleID}
            onChange={(value) => setFormData({ ...formData, roleID: value })}
            style={{ width: "100%" }}
            options={[
              { label: "Worker", value: 3 },
              { label: "Foreman", value: 2 },
            ]}
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
