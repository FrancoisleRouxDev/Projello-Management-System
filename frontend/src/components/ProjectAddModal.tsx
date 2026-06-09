import React, { useState, useEffect } from "react";
import CustomModal from "./CustomModal";
import { Button } from "antd";
import { PlusCircle } from "lucide-react";
import "./WorkerClientAddModal.css";
import "./ProjectAddModal.css";

interface ProjectAddModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
  clientId?: string;
  clientName?: string;
  clientOptions?: string[];
  disableClientName?: boolean;
}

interface ProjectFormData {
  name: string;
  description: string;
  clientName: string;
  dueDate?: string;
  startDate?: string;
}

export const ProjectAddModal: React.FC<ProjectAddModalProps> = ({
  open,
  onClose,
  onSubmit,
  clientName,
  clientOptions,
  disableClientName,
}) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    clientName: clientName || "",
    startDate: "",
    dueDate: "",
  });

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
    if (clientOptions && clientOptions.length > 0 && !clientOptions.includes(formData.clientName)) {
      alert("Please select a valid client from the list.");
      return;
    }
    onSubmit(formData);
    setFormData({ name: "", description: "", clientName: "", startDate: "", dueDate: "" });
    onClose();
  };

  const handleCancel = () => {
    setFormData({ name: "", description: "", clientName: "", startDate: "", dueDate: "" });
    onClose();
  };

  return (
    <CustomModal
      open={open}
      onCancel={handleCancel}
      title={
        <div className="entity-modal__title-row">
          <div>
            <div className="entity-modal__title">Add New Project</div>
            <div className="entity-modal__subtitle">Create a new project record</div>
          </div>
        </div>
      }
      footer={
        <div className="entity-modal__footer">
          <Button onClick={handleCancel}>Cancel</Button>
          <Button type="primary" onClick={handleSubmit}>Create Project</Button>
        </div>
      }
      wrapClassName="entity-modal entity-modal--project"
      width={680}
    >
      <form className="entity-modal__form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        
        {/* Project Name */}
        <div className="entity-modal__form-group">
          <label className="entity-modal__label entity-modal__label--required">Project Name</label>
          <input
            type="text"
            className="entity-modal__input"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter project name"
          />
        </div>

        {/* Client Name */}
        <div className="entity-modal__form-group">
          <label className="entity-modal__label entity-modal__label--required">Client Name</label>
          {clientOptions && clientOptions.length > 0 && !disableClientName ? (
            <select
              className="entity-modal__input"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            >
              <option value="" disabled>Select a client</option>
              {clientOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              className="entity-modal__input"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              placeholder="Enter client name"
              disabled={disableClientName}
            />
          )}
        </div>

        {/* Description */}
        <div className="entity-modal__form-group">
          <label className="entity-modal__label">Description</label>
          <textarea
            className="entity-modal__textarea"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter project description"
            rows={4}
          />
        </div>

        <div className="entity-modal__form-group">
          <label className="entity-modal__label" htmlFor="project-start-date">Start Date</label>
          <input
            id="project-start-date"
            type="date"
            className="entity-modal__input"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            title="Start date"
            placeholder="Select start date"
            aria-label="Start date"
          />
        </div>

        {/* Due Date */}
        <div className="entity-modal__form-group">
          <label className="entity-modal__label" htmlFor="project-due-date">Due Date</label>
          <input
            id="project-due-date"
            type="date"
            className="entity-modal__input"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            title="Due date"
            placeholder="Select due date"
            aria-label="Due date"
          />
        </div>

      </form>
    </CustomModal>
  );
};