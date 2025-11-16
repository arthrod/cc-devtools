import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './Button';
import type { Story } from '../../../../kanban/types.js';

/**
 * Configuration for the StoryAutocomplete component.
 */
interface StoryAutocompleteProps {
  /** Available stories to search through and select from */
  stories: Story[];
  /** Callback invoked when a story is selected by ID */
  onSelect: (storyId: string) => void;
  /** Story IDs to exclude from selection (e.g., current story, existing dependencies) */
  excludeIds?: string[];
  /** Input field placeholder text */
  placeholder?: string;
}

/**
 * Searchable autocomplete component for selecting Kanban stories.
 *
 * Features keyboard navigation, fuzzy search by ID or title, and excludes
 * specified story IDs to prevent circular dependencies or self-references.
 */
export function StoryAutocomplete({
  stories,
  onSelect,
  excludeIds = [],
  placeholder = "Search for story..."
}: StoryAutocompleteProps): JSX.Element {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter and limit results for performance with large story sets
  const filteredStories = stories.filter(story => {
    if (excludeIds.includes(story.id)) return false;
    if (!inputValue) return true;

    const searchTerm = inputValue.toLowerCase();
    return (
      story.id.toLowerCase().includes(searchTerm) ||
      story.title.toLowerCase().includes(searchTerm)
    );
  }).slice(0, 10);

  // Enable direct story ID input when user types exact ID
  const isValidStoryId = stories.some(story =>
    story.id === inputValue && !excludeIds.includes(story.id)
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

  const handleStorySelect = (storyId: string): void => {
    onSelect(storyId);
    setInputValue('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleAddClick = (): void => {
    if (isValidStoryId) {
      handleStorySelect(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // Priority order: highlighted selection > exact ID match (only if user explicitly typed it)
      if (highlightedIndex >= 0 && filteredStories[highlightedIndex]) {
        handleStorySelect(filteredStories[highlightedIndex].id);
      }
      else if (isValidStoryId) {
        handleStorySelect(inputValue);
      }
      return;
    }

    if (e.key === 'Tab') {
      // Allow tab to proceed to next input - close dropdown but don't prevent default
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
        if (filteredStories.length > 0) {
          // Start from -1, so first arrow down goes to index 0
          setHighlightedIndex(prev =>
            prev < filteredStories.length - 1 ? prev + 1 : 0  // Wrap to top
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (filteredStories.length > 0) {
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : filteredStories.length - 1  // Wrap to bottom
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
          size="base"
          onClick={handleAddClick}
          disabled={!isValidStoryId}
          className="flex items-center"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {isOpen && (inputValue.length > 0 || filteredStories.length > 0) && (
        <div
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredStories.length > 0 ? (
            <ul ref={listRef} className="py-1">
              {filteredStories.map((story, index) => (
                <li key={story.id}>
                  <button
                    type="button"
                    onClick={() => handleStorySelect(story.id)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      index === highlightedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                    }`}
                  >
                    <div className="font-mono text-sm text-blue-600 dark:text-blue-400">
                      {story.id}
                    </div>
                    <div className="text-sm text-gray-900 dark:text-gray-100 truncate">
                      {story.title}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : inputValue.length > 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              No stories found matching "{inputValue}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
