import "./AddButton.css";

interface AddButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export const AddButton: React.FC<AddButtonProps> = ({
  label,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      className="add-button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Add ${label}`}
    >
      <span className="add-button__icon">+</span>
      <span className="add-button__label">{label}</span>
    </button>
  );
};
