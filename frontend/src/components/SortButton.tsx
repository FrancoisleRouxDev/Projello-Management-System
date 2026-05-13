import React from "react";
import "./SortButton.css";

/**
 * SortButton Component
 * A button to trigger sorting options.
 * Displays a label and provides a callback for sort functionality.
 * Props: label (customizable text), onSort (callback when clicked)
 */



interface SortButtonProps {
  label?: string;
  onSort?: () => void;
}

export const SortButton: React.FC<SortButtonProps> = ({
  label = "Sort",
  onSort,
}) => {
  return (
    <button className="StyledButton01" onClick={onSort}>
      <div className="StyledText01">
        <p className="StyledSort">
          <span className="StyledSortspan">{label}</span>
        </p>
      </div>
    </button>
  );
};
