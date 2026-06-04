import React, { useState } from "react";
import "./PasswordInput.css";

interface PasswordInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  required?: boolean;
  id?: string;
  name?: string;
  autoComplete?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  value,
  onChange,
  placeholder = "Password",
  className,
  wrapperClassName,
  required = false,
  id,
  name,
  autoComplete,
  inputProps,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`password-input-wrapper ${wrapperClassName || ""}`}>
      <input
        id={id}
        name={name}
        className={`password-input ${className || ""}`}
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        {...inputProps}
      />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? "Hide" : "Show"}
      </button>
    </div>
  );
};
