import React from "react";
import "../pages/settings/settings.css";

interface CustomSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

const CustomSwitch: React.FC<CustomSwitchProps> = ({ checked, onChange, disabled, label }) => (
  <label className="theme-switch" style={{ margin: 0 }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      disabled={disabled}
    />
    <span className="slider"></span>
    {label && <span className="theme-label-text">{label}</span>}
  </label>
);

export default CustomSwitch;
