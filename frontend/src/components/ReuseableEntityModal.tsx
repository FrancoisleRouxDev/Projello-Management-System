import React, { useEffect, useState } from "react";
import CustomModal from "./CustomModal";
import { Button } from "antd";
import "./ReuseableEntityModal.css";  

type FormValues = Record<string, string | number | boolean | null | undefined>;

interface ReusableModalProps<TValues extends FormValues> {
  open: boolean;
  title: string;
  submitLabel: string;
  cancelLabel?: string;
  onClose: () => void;
  onSubmit: (data: TValues) => void;
  initialValues: TValues;
  renderFields: (
    values: TValues,
    setValue: <K extends keyof TValues>(key: K, value: TValues[K]) => void,
    error: string | null
  ) => React.ReactNode;
  validate?: (values: TValues) => string | null;
  width?: number;
}

export function ReusableEntryModal<TValues extends FormValues>({
  open,
  title,
  submitLabel,
  cancelLabel = "Cancel",
  onClose,
  onSubmit,
  initialValues,
  renderFields,
  validate,
  width = 420,
}: ReusableModalProps<TValues>) {
  const [values, setValues] = useState<TValues>(initialValues);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setError(null);
    }
  }, [open, initialValues]);

  const setValue = <K extends keyof TValues>(key: K, value: TValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (error) setError(null);
  };

  const handleSubmit = () => {
    const validationError = validate ? validate(values) : null;
    if (validationError) {
      setError(validationError);
      return;
    }

    onSubmit(values);
    setValues(initialValues);
    setError(null);
    onClose();
  };

  const handleCancel = () => {
    setValues(initialValues);
    setError(null);
    onClose();
  };

  return (
    <CustomModal
      open={open}
      onCancel={handleCancel}
      title={title}
      width={width}
      wrapClassName="reusable-entity-modal"  // <-- Add this to CustomModal
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          {cancelLabel}
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          {submitLabel}
        </Button>,
      ]}
    >
      <div className="reusable-entity-modal__content">
        {renderFields(values, setValue, error)}
      </div>
    </CustomModal>
  );
}