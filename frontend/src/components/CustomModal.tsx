import React from "react";
import { Modal } from "antd";
import "./CustomModal.css";

interface CustomModalProps {
  open: boolean;
  onCancel: () => void;
  title?: React.ReactNode;           // ← Fixed: now accepts JSX + string
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  wrapClassName?: string;
}

const CustomModal: React.FC<CustomModalProps> = ({ 
  open, 
  onCancel, 
  title, 
  children, 
  footer, 
  width, 
  wrapClassName 
}) => (
  <Modal
    open={open}
    onCancel={onCancel}
    title={title}
    footer={footer}
    width={width || 420}
    wrapClassName={["custom-modal", wrapClassName].filter(Boolean).join(" ")}
    centered
    destroyOnHidden
    mask={{ closable: !footer }}
    getContainer={false}
  >
    {children}
  </Modal>
);

export default CustomModal;