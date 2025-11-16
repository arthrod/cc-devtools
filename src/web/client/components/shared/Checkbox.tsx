import React from 'react';
import { clsx } from 'clsx';
import { Check } from 'lucide-react';

/**
 * Props interface for Checkbox component
 */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  /**
   * Whether the checkbox is checked
   */
  checked: boolean;
  /**
   * Callback when checkbox state changes
   */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * Label text to display next to checkbox
   */
  label?: string;
  /**
   * Whether the checkbox is in an error state
   */
  error?: boolean;
  /**
   * Additional CSS classes to apply to the wrapper
   */
  className?: string;
}

/**
 * Standardized checkbox component with consistent styling and accessibility features.
 *
 * Features:
 * - Custom checkmark icon (consistent cross-browser appearance)
 * - Touch-friendly minimum 44px tap target
 * - Keyboard support (Space to toggle)
 * - Accessible ARIA attributes
 * - Consistent with Input component styling (16px font context)
 * - States: normal, hover, focus, checked, disabled, error
 * - Dark mode support
 *
 * Usage:
 * ```tsx
 * <Checkbox
 *   checked={isChecked}
 *   onChange={(e) => setIsChecked(e.target.checked)}
 *   label="Accept terms and conditions"
 * />
 * ```
 */
export function Checkbox({
  checked,
  onChange,
  label,
  error = false,
  disabled = false,
  className = '',
  id,
  ...props
}: CheckboxProps): JSX.Element {
  // Generate unique ID if not provided (for label association)
  const checkboxId = id ?? `checkbox-${React.useId()}`;

  return (
    <label
      htmlFor={checkboxId}
      className={clsx(
        'inline-flex items-center min-h-[2.5rem] sm:min-h-[2.25rem] cursor-pointer select-none',
        {
          'opacity-50 cursor-not-allowed': disabled,
        },
        className
      )}
    >
      {/* Hidden native checkbox for accessibility and form integration */}
      <input
        type="checkbox"
        id={checkboxId}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only peer"
        aria-invalid={error}
        {...props}
      />

      {/* Custom checkbox visual */}
      <span
        className={clsx(
          'relative inline-flex items-center justify-center',
          'w-5 h-5 rounded border-2 transition-all duration-200',
          'focus-visible:outline-none touch-manipulation',
          {
            // Unchecked states
            'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800':
              !checked && !error,
            'hover:border-neutral-400 dark:hover:border-neutral-500':
              !checked && !error && !disabled,

            // Checked states
            'border-red-600 bg-red-600 dark:border-red-500 dark:bg-red-500':
              checked && !error,
            'hover:border-red-700 hover:bg-red-700 dark:hover:border-red-400 dark:hover:bg-red-400':
              checked && !error && !disabled,

            // Error states
            'border-red-500 dark:border-red-400': error && !checked,
            'border-red-700 bg-red-700 dark:border-red-600 dark:bg-red-600': error && checked,

            // Focus state (via peer selector from hidden input)
            'peer-focus-visible:ring-2 peer-focus-visible:ring-red-500 peer-focus-visible:ring-offset-2':
              true,
          }
        )}
        aria-hidden="true"
      >
        {/* Checkmark icon */}
        {checked && (
          <Check
            className="w-3.5 h-3.5 text-white stroke-[3]"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </span>

      {/* Label text */}
      {label && (
        <span
          className={clsx(
            'ml-2 text-sm font-sans leading-normal',
            {
              'text-neutral-700 dark:text-neutral-300': !error,
              'text-red-600 dark:text-red-400': error,
            }
          )}
        >
          {label}
        </span>
      )}
    </label>
  );
}
