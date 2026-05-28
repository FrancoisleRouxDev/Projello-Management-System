import React, { useState, useEffect } from "react";
import CustomModal from "./CustomModal";
import { Button } from "antd";
import "./ProjectAddModal.css";

interface ProjectAddModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
  clientId?: string;      // optional - passed from action menu
  clientName?: string;    // prefill when opened from client row
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
  clientName,
}) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    clientName: clientName || "",
    dueDate: "",
  });

  // Prefill client name when modal is opened from the 3-dots action menu
  useEffect(() => {
    if (open && clientName) {
      setFormData(prev => ({ ...prev, clientName }));
    }
  }, [open, clientName]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert("Project name is required");
      return;
    }
    if (!formData.clientName.trim()) {
      alert("Client name is required");
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
      // title={
      //   <div className="entity-modal__title-row">
      //     <div className="entity-modal__title-icon" aria-hidden="true">
      //     </div>
      //     <div>
      //       <div className="entity-modal__title">Add New Project</div>
      //       <div className="entity-modal__subtitle">Create a new project record</div>
      //     </div>
      //   </div>
      // }
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
            disabled={!!clientName}   // disabled when prefilled from action menu
          />
        </div>

        <div className="project-add-modal__form-group">
          <label className="project-add-modal__label">Description</label>
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
          <label className="project-add-modal__label" htmlFor="project-due-date">Due Date</label>
          <input
            id="project-due-date"
            type="date"
            className="project-add-modal__input"
            value={formData.dueDate}
            onChange={(e) =>
              setFormData({ ...formData, dueDate: e.target.value })
            }
            title="Due date"
            placeholder="Select due date"
            aria-label="Due date"
          />
        </div>
      </div>
    </CustomModal>
  );
};