import React from "react";
import { Modal } from "antd";

interface CustomModalProps {
  open: boolean;
  onCancel: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}

const CustomModal: React.FC<CustomModalProps> = ({ open, onCancel, title, children, footer, width }) => (
  <Modal
    open={open}
    onCancel={onCancel}
    title={title}
    footer={footer}
    width={width || 420}
    centered
    destroyOnHidden
    mask={{ closable: !footer }}
  >
    {children}
  </Modal>
);

export default CustomModal;
