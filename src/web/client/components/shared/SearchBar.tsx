import React, { memo } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { Input } from './FormField';

interface SearchBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  disabled?: boolean;
  onClear?: () => void;
}

/**
 * Standardized search bar component with search icon and optional clear button.
 * Uses Input component internally for consistent styling and 16px font (no mobile zoom).
 *
 * Features:
 * - Search icon prefix (left side)
 * - Optional clear button (X icon, shows when value is non-empty)
 * - Memoized for performance
 * - Accessible with proper ARIA labels
 * - Touch-friendly
 *
 * Usage:
 * ```tsx
 * <SearchBar
 *   value={searchQuery}
 *   onChange={handleSearchChange}
 *   placeholder="Search stories..."
 *   inputRef={searchInputRef}
 * />
 * ```
 */
export const SearchBar = memo(({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  inputRef,
  disabled = false,
  onClear
}: SearchBarProps): JSX.Element => {
  return (
    <div className={`search-container ${className}`}>
      <SearchIcon className="search-icon" aria-hidden="true" />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="search-input"
        data-search-input
        aria-label={placeholder}
        disabled={disabled}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Clear search"
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';
