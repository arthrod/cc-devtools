import { useState, type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { Input } from './FormField';
import { Chip } from './Chip';

/**
 * Props for the ArrayFieldInput component
 */
interface ArrayFieldInputProps {
  /** Array of string values */
  values: string[];
  /** Callback when a value is added */
  onAdd: (value: string) => void;
  /** Callback when a value is removed by index */
  onRemove: (index: number) => void;
  /** Placeholder text for input field */
  placeholder?: string;
  /** Custom input element (e.g., autocomplete) - receives value, onChange, onKeyDown */
  renderInput?: (props: {
    value: string;
    onChange: (value: string) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    placeholder: string;
    disabled: boolean;
  }) => ReactNode;
  /** Custom rendering for each item - receives value, index, and remove callback */
  renderItem?: (value: string, index: number, onRemove: () => void) => ReactNode;
  /** Custom rendering for item content only (delete button added automatically) - receives value and index */
  renderItemContent?: (value: string, index: number) => ReactNode;
  /** Display variant for default rendering */
  itemVariant?: 'chip' | 'list-item';
  /** Chip variant when using chip display */
  chipVariant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  /** Optional chip icon */
  chipIcon?: ReactNode;
  /** Validation function - return true if valid */
  validate?: (value: string) => boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Hide the add button (useful when renderInput has its own submit mechanism) */
  hideAddButton?: boolean;
}

/**
 * Reusable component for managing arrays of strings with add/remove functionality.
 * Supports custom input rendering (e.g., autocomplete) and custom item rendering.
 */
export function ArrayFieldInput({
  values,
  onAdd,
  onRemove,
  placeholder = 'Add item...',
  renderInput,
  renderItem,
  renderItemContent,
  itemVariant = 'chip',
  chipVariant = 'primary',
  chipIcon,
  validate,
  disabled = false,
  className = '',
  hideAddButton = false
}: ArrayFieldInputProps): JSX.Element {
  const [inputValue, setInputValue] = useState('');

  const handleAdd = (): void => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // Validate if validator provided
    if (validate && !validate(trimmed)) return;

    // Don't add duplicates
    if (values.includes(trimmed)) {
      setInputValue('');
      return;
    }

    onAdd(trimmed);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const handleRemove = (index: number): void => {
    onRemove(index);
  };

  // Default chip rendering
  const renderDefaultChip = (value: string, index: number): ReactNode => (
    <Chip
      key={index}
      label={value}
      variant={chipVariant}
      size="sm"
      icon={chipIcon}
      onRemove={() => handleRemove(index)}
      disabled={disabled}
    />
  );

  // Default list item content rendering (just the text)
  const renderDefaultListItemContent = (value: string): ReactNode => (
    <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
      {value}
    </span>
  );

  // Wrapper that adds delete button to content
  const renderListItemWithDelete = (content: ReactNode, index: number): ReactNode => (
    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-neutral-800 rounded-md">
      {content}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => handleRemove(index)}
        disabled={disabled}
        className="text-red-400 hover:text-red-600 p-1 h-auto min-h-0"
        aria-label="Remove item"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Display existing items */}
      {values.length > 0 && (
        <div className={itemVariant === 'chip' ? 'flex flex-wrap gap-2' : 'space-y-2'}>
          {values.map((value, index) => {
            // Priority: renderItem (full control) > renderItemContent (content only) > default
            if (renderItem) {
              return <div key={index}>{renderItem(value, index, () => handleRemove(index))}</div>;
            }
            if (itemVariant === 'chip') {
              return renderDefaultChip(value, index);
            }
            // For list items, use renderItemContent if provided, otherwise use default
            if (renderItemContent) {
              const content = renderItemContent(value, index);
              return renderListItemWithDelete(content, index);
            }
            const defaultContent = renderDefaultListItemContent(value);
            return renderListItemWithDelete(defaultContent, index);
          })}
        </div>
      )}

      {/* Input field with optional add button */}
      <div className={hideAddButton ? '' : 'flex space-x-2'}>
        {renderInput ? (
          renderInput({
            value: inputValue,
            onChange: setInputValue,
            onKeyDown: handleKeyDown,
            placeholder,
            disabled
          })
        ) : (
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1"
          />
        )}
        {!hideAddButton && (
          <Button
            type="button"
            size="base"
            onClick={handleAdd}
            disabled={!inputValue.trim() || disabled}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
