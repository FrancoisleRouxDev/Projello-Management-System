import React, { useState } from "react";
import CustomModal from "./CustomModal";
import { Button } from "antd";
import "./ProjectAddModal.css";

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
      <div className="project-add-modal__form">
        <div className="project-add-modal__form-group">
          <label className="project-add-modal__label project-add-modal__label--required">
            Project Name
          </label>
          <input
            type="text"
            className="project-add-modal__input"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter project name"
          />
        </div>
        <div className="project-add-modal__form-group">
          <label className="project-add-modal__label project-add-modal__label--required">
            Client Name
          </label>
          <input
            type="text"
            className="project-add-modal__input"
            value={formData.clientName}
            onChange={(e) =>
              setFormData({ ...formData, clientName: e.target.value })
            }
            placeholder="Enter client name"
          />
        </div>
        <div className="project-add-modal__form-group">
          <label className="project-add-modal__label">
            Description
          </label>
          <textarea
            className="project-add-modal__textarea"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Enter project description"
            rows={4}
          />
        </div>
        <div className="project-add-modal__form-group">
          <label className="project-add-modal__label">
            Due Date
          </label>
          <input
            type="date"
            className="project-add-modal__input"
            value={formData.dueDate}
            onChange={(e) =>
              setFormData({ ...formData, dueDate: e.target.value })
            }
          />
        </div>
      </div>
    </CustomModal>
  );
};
