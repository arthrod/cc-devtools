import { useState, useRef, useEffect } from 'react';
import type { Story } from '../../../../kanban/types.js';

interface PhaseAutocompleteProps {
  stories: Story[];
  value: string;
  onChange: (phase: string) => void;
  placeholder?: string;
}

/**
 * Autocomplete input for selecting project phases, extracting existing phases from kanban stories.
 * Automatically transforms input to uppercase and filters out spaces for consistent phase naming.
 */
export function PhaseAutocomplete({
  stories,
  value,
  onChange,
  placeholder = "Enter or select phase..."
}: PhaseAutocompleteProps): JSX.Element {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  /**
   * Extracts phase prefix from story ID using backend convention.
   */
  const getPhaseFromStoryId = (storyId: string): string => {
    const match = storyId.match(/^(.+)-(\d+)$/);
    return match ? match[1]! : 'STORY';
  };

  const existingPhases = Array.from(
    new Set(stories.map(story => getPhaseFromStoryId(story.id)))
  ).sort();

  const filteredPhases = existingPhases.filter(phase => {
    if (!inputValue) return true;
    return phase.toLowerCase().includes(inputValue.toLowerCase());
  }).slice(0, 10);

  /**
   * Normalizes phase input to match backend format requirements.
   */
  const transformInput = (input: string): string => {
    return input.toUpperCase().replace(/\s+/g, '');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const rawValue = e.target.value;
    const transformedValue = transformInput(rawValue);

    setInputValue(transformedValue);
    onChange(transformedValue);
    setIsOpen(true);

    const currentFilteredPhases = existingPhases.filter(phase => {
      if (!transformedValue) return true;
      return phase.toLowerCase().includes(transformedValue.toLowerCase());
    }).slice(0, 10);

    // Auto-highlight first match for keyboard navigation
    setHighlightedIndex(currentFilteredPhases.length > 0 ? 0 : -1);
  };

  const handleInputFocus = (): void => {
    setIsOpen(true);
  };

  const handleInputBlur = (): void => {
    // Delay closing to prevent dropdown from closing before click events fire
    setTimeout(() => setIsOpen(false), 200);
  };

  const handlePhaseSelect = (phase: string): void => {
    const transformedPhase = transformInput(phase);
    setInputValue(transformedPhase);
    onChange(transformedPhase);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();

      if (highlightedIndex >= 0 && filteredPhases[highlightedIndex]) {
        handlePhaseSelect(filteredPhases[highlightedIndex]);
      }
      else if (filteredPhases.length > 0) {
        handlePhaseSelect(filteredPhases[0]!);
      }
      // No matching phases - keep current transformed input
      return;
    }

    if (!isOpen) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (filteredPhases.length > 0) {
          setHighlightedIndex(prev =>
            prev < filteredPhases.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (filteredPhases.length > 0) {
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : filteredPhases.length - 1
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

  // Sync internal state with external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Keep highlighted dropdown item visible during keyboard navigation
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
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
        placeholder={placeholder}
      />

      {isOpen && filteredPhases.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <ul ref={listRef} className="py-1">
            {filteredPhases.map((phase, index) => {
              const storiesInPhase = stories.filter(s => getPhaseFromStoryId(s.id) === phase).length;
              return (
                <li key={phase}>
                  <button
                    type="button"
                    onClick={() => handlePhaseSelect(phase)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      index === highlightedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="font-mono text-sm text-blue-600 dark:text-blue-400">
                        {phase}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {storiesInPhase} stories
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
