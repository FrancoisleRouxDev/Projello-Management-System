import React, { useState } from "react";
import CustomModal from "./CustomModal";
import { Button } from "antd";

interface ProjectAddModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
}

interface ProjectFormData {
  name: string;
  description: string;
  clientName: string;
  dueDate?: string;
}

export const ProjectAddModal: React.FC<ProjectAddModalProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    clientName: "",
    dueDate: "",
  });

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.clientName.trim()) {
      alert("Please fill in project name and client name");
      return;
    }
    onSubmit(formData);
    setFormData({ name: "", description: "", clientName: "", dueDate: "" });
    onClose();
  };

  const handleCancel = () => {
    setFormData({ name: "", description: "", clientName: "", dueDate: "" });
    onClose();
  };

  return (
    <CustomModal
      open={open}
      onCancel={handleCancel}
      title="Add New Project"
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          Create Project
        </Button>,
      ]}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
            Project Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter project name"
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
            Client Name *
          </label>
          <input
            type="text"
            value={formData.clientName}
            onChange={(e) =>
              setFormData({ ...formData, clientName: e.target.value })
            }
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
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Enter project description"
            rows={4}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d9d9d9",
              borderRadius: "6px",
              fontSize: "14px",
              fontFamily: "Roboto, sans-serif",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "6px", fontWeight: 500 }}>
            Due Date
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) =>
              setFormData({ ...formData, dueDate: e.target.value })
            }
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
