import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './Button';
import type { Story } from '../../../../kanban/types.js';

/**
 * Props for the LabelAutocomplete component.
 */
interface LabelAutocompleteProps {
  stories: Story[];
  selectedLabels: string[];
  onAddLabel: (label: string) => void;
  placeholder?: string;
}

/**
 * Autocomplete input for labels with keyboard navigation and new label creation.
 *
 * Provides suggestions from existing story labels, allows creating new labels,
 * and includes keyboard navigation (arrows, Enter, Escape) for accessibility.
 */
export function LabelAutocomplete({
  stories,
  selectedLabels,
  onAddLabel,
  placeholder = "Add label..."
}: LabelAutocompleteProps): JSX.Element {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  /**
   * Extracts all unique labels from stories for autocomplete suggestions.
   */
  const getAllLabels = (): string[] => {
    const allLabels = new Set<string>();
    stories.forEach(story => {
      if (story.labels) {
        story.labels.forEach((label: string) => allLabels.add(label));
      }
    });
    return Array.from(allLabels).sort();
  };

  const existingLabels = getAllLabels();

  // Filter suggestions, excluding already selected labels and limiting to 10 items for UI performance
  const filteredLabels = existingLabels.filter(label => {
    if (selectedLabels.includes(label)) return false;
    if (!inputValue) return true;
    return label.toLowerCase().includes(inputValue.toLowerCase());
  }).slice(0, 10);

  // Show "Create new" option only for novel, non-empty labels
  const isNewLabel = inputValue.trim() && !existingLabels.includes(inputValue.trim()) && !selectedLabels.includes(inputValue.trim());

  /**
   * Handles input value changes and opens dropdown.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setInputValue(value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = (): void => {
    setIsOpen(true);
  };

  /**
   * Handles input blur with delayed dropdown close.
   */
  const handleInputBlur = (): void => {
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleLabelSelect = (label: string): void => {
    onAddLabel(label);
    setInputValue('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleAddClick = (): void => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !selectedLabels.includes(trimmedValue)) {
      handleLabelSelect(trimmedValue);
    }
  };

  /**
   * Handles keyboard navigation and selection within the dropdown.
   */
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Selection priority: highlighted existing option > create new label
      if (highlightedIndex >= 0 && filteredLabels[highlightedIndex]) {
        handleLabelSelect(filteredLabels[highlightedIndex]);
      }
      else if (inputValue.trim() && !selectedLabels.includes(inputValue.trim())) {
        handleLabelSelect(inputValue.trim());
      }
      return;
    }

    if (e.key === 'Tab') {
      // Close dropdown but allow normal tab navigation to continue
      setIsOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    if (!isOpen) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (filteredLabels.length > 0) {
          // Cycle from top to bottom
          setHighlightedIndex(prev =>
            prev < filteredLabels.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (filteredLabels.length > 0) {
          // Cycle from bottom to top
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : filteredLabels.length - 1
          );
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Auto-scroll to keep highlighted option visible during keyboard navigation
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current?.children[highlightedIndex]) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      highlightedElement.scrollIntoView({
        block: 'nearest'
      });
    }
  }, [highlightedIndex]);


  return (
    <div className="relative">
      <div className="flex space-x-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          className="input flex-1"
          placeholder={placeholder}
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAddClick}
          disabled={!inputValue.trim() || selectedLabels.includes(inputValue.trim())}
          className="flex items-center"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {(isOpen && (filteredLabels.length > 0 || isNewLabel)) && (
        <div
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          <ul ref={listRef} className="py-1">
            {filteredLabels.map((label, index) => {
              const storiesWithLabel = stories.filter(s => s.labels?.includes(label)).length;
              return (
                <li key={label}>
                  <button
                    type="button"
                    onClick={() => handleLabelSelect(label)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      index === highlightedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {storiesWithLabel} stories
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}

            {isNewLabel && (
              <li>
                <button
                  type="button"
                  onClick={() => handleLabelSelect(inputValue.trim())}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center">
                    <Plus className="h-3 w-3 mr-2 text-green-500" />
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      Create "<span className="font-medium">{inputValue.trim()}</span>"
                    </div>
                  </div>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
