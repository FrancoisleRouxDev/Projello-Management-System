import React from "react";
import "./FilterButton.css";

/**
 * FilterButton Component
 * A dropdown filter button with a downward chevron icon.
 * Used to trigger filter options, commonly for status filtering.
 * Props: label (customizable text), onFilter (callback when clicked)
 */



interface FilterButtonProps {
  label?: string;
  onFilter?: () => void;
}

export const FilterButton: React.FC<FilterButtonProps> = ({
  label = "All Status",
  onFilter,
}) => {
  return (
    <button className="StyledButton" onClick={onFilter}>
      <div className="StyledText">
        <p className="StyledAllStatus">
          <span className="StyledAllstatusspan">{label}</span>
        </p>
      </div>
      <div className="StyledIcon01">
        <div className="StyledVector02" />
      </div>
    </button>
  );
};
