import React from "react";
import "./SearchInput.css";

/**
 * SearchInput Component
 * A search input field with a search icon.
 * Provides a text input for searching with a customizable placeholder and callback.
 */


interface SearchInputProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = "Search clients...",
  onSearch,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  return (
    <div className="StyledContainer">
      <div className="StyledInput">
        <input
          type="text"
          placeholder={placeholder}
          className="StyledSearchInput"
          onChange={handleChange}
        />
      </div>
      <div className="StyledIcon">
        <div className="StyledVector" />
        <div className="StyledVector01" />
      </div>
    </div>
  );
};
