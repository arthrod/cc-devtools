import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Props for the Select component.
 */
interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/**
 * Custom dropdown component that matches the styling of autocomplete dropdowns.
 * Provides consistent appearance with keyboard navigation and accessibility.
 *
 * This component provides better UX than native HTML select with:
 * - Searchable/filterable options
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Touch-friendly interaction (no mobile keyboard)
 * - Consistent cross-browser appearance
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  required = false,
  className = ''
}: SelectProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const currentOption = options.find(opt => opt.value === value);

  const handleClick = (): void => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setHighlightedIndex(-1);
    }
  };

  const handleFocus = (): void => {
    if (!disabled) {
      setIsOpen(true);
      setHighlightedIndex(-1);
    }
  };

  const handleOptionSelect = (optionValue: string, e?: React.MouseEvent): void => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onChange(optionValue);
    setIsOpen(false);
    setHighlightedIndex(-1);
    // Don't focus on mobile to prevent keyboard from showing
    if (!('ontouchstart' in window)) {
      buttonRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (disabled) return;

    if (e.key === 'Enter') {
      e.preventDefault();

      // Priority order: highlighted option > current value (no change)
      if (highlightedIndex >= 0 && options[highlightedIndex]) {
        handleOptionSelect(options[highlightedIndex].value);
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
        // Start from -1, so first arrow down goes to index 0
        setHighlightedIndex(prev =>
          prev < options.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : options.length - 1
        );
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        buttonRef.current?.focus();
        break;
    }
  };

  const handleBlur = (e: React.FocusEvent): void => {
    // Delay closing to allow option clicks to register on mobile
    setTimeout(() => {
      // Only close if focus is not moving to a dropdown option
      if (!e.relatedTarget || !listRef.current?.contains(e.relatedTarget as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, 150);
  };

  // Ensure highlighted option remains visible during keyboard navigation
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current?.children[highlightedIndex]) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      highlightedElement.scrollIntoView({
        block: 'nearest'
      });
    }
  }, [highlightedIndex]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
          listRef.current && !listRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }

    return undefined;
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} style={{ zIndex: isOpen ? 1000 : 'auto' }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={disabled}
        aria-required={required}
        className={`
          input w-full flex items-center justify-between touch-manipulation
          ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby="custom-select-label"
      >
        <span className={currentOption ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400'}>
          {currentOption ? currentOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary-500' : 'text-neutral-400'}`} />
      </button>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          <ul ref={listRef} className="py-1" role="listbox">
            {options.map((option, index) => (
              <li key={option.value} role="option" aria-selected={option.value === value}>
                <button
                  type="button"
                  onClick={() => handleOptionSelect(option.value)}
                  className={`
                    w-full px-3 py-2 text-left text-sm transition-colors duration-150
                    ${index === highlightedIndex
                      ? 'bg-neutral-100 dark:bg-neutral-700'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-750'
                    }
                    ${option.value === value
                      ? 'text-primary-600 dark:text-primary-400 font-medium'
                      : 'text-neutral-900 dark:text-neutral-100'
                    }
                    focus:outline-none focus:bg-neutral-100 dark:focus:bg-neutral-700
                  `}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
