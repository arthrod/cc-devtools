import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './Button';
import type { Subtask } from '../../../../kanban/types.js';

/**
 * Configuration for the SubtaskDependencyAutocomplete component.
 */
interface SubtaskDependencyAutocompleteProps {
  /** Available subtasks to search through and select from */
  subtasks: Subtask[];
  /** Callback invoked when a subtask is selected by ID */
  onSelect: (subtaskId: string) => void;
  /** Subtask IDs to exclude from selection (e.g., current subtask, existing dependencies) */
  excludeIds?: string[];
  /** Input field placeholder text */
  placeholder?: string;
}

/**
 * Searchable autocomplete component for selecting subtasks as dependencies.
 *
 * Features keyboard navigation, fuzzy search by ID or title, and excludes
 * specified subtask IDs to prevent circular dependencies or self-references.
 */
export function SubtaskDependencyAutocomplete({
  subtasks,
  onSelect,
  excludeIds = [],
  placeholder = "Search for subtask..."
}: SubtaskDependencyAutocompleteProps): JSX.Element {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter and limit results for performance with large subtask sets
  const filteredSubtasks = subtasks.filter(subtask => {
    if (excludeIds.includes(subtask.id)) return false;
    if (!inputValue) return true;

    const searchTerm = inputValue.toLowerCase();
    return (
      subtask.id.toLowerCase().includes(searchTerm) ||
      subtask.title.toLowerCase().includes(searchTerm)
    );
  }).slice(0, 10);

  // Enable direct subtask ID input when user types exact ID
  const isValidSubtaskId = subtasks.some(subtask =>
    subtask.id === inputValue && !excludeIds.includes(subtask.id)
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setInputValue(value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = (): void => {
    setIsOpen(true);
  };

  const handleInputBlur = (): void => {
    setTimeout(() => setIsOpen(false), 200);
  };

  const handleSubtaskSelect = (subtaskId: string): void => {
    onSelect(subtaskId);
    setInputValue('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleAddClick = (): void => {
    if (isValidSubtaskId) {
      handleSubtaskSelect(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Priority order: highlighted selection > exact ID match (only if user explicitly typed it)
      if (highlightedIndex >= 0 && filteredSubtasks[highlightedIndex]) {
        handleSubtaskSelect(filteredSubtasks[highlightedIndex].id);
      }
      else if (isValidSubtaskId) {
        handleSubtaskSelect(inputValue);
      }
      return;
    }

    if (e.key === 'Tab') {
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
        if (filteredSubtasks.length > 0) {
          setHighlightedIndex(prev =>
            prev < filteredSubtasks.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (filteredSubtasks.length > 0) {
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : filteredSubtasks.length - 1
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

  // Ensure highlighted items remain visible during keyboard navigation
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
          disabled={!isValidSubtaskId}
          className="flex items-center"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {isOpen && (inputValue.length > 0 || filteredSubtasks.length > 0) && (
        <div
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredSubtasks.length > 0 ? (
            <ul ref={listRef} className="py-1">
              {filteredSubtasks.map((subtask, index) => (
                <li key={subtask.id}>
                  <button
                    type="button"
                    onClick={() => handleSubtaskSelect(subtask.id)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      index === highlightedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                    }`}
                  >
                    <div className="font-mono text-sm text-blue-600 dark:text-blue-400">
                      {subtask.id}
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                      {subtask.title}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : inputValue.length > 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              No subtasks found matching "{inputValue}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
