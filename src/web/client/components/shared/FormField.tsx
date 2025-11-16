import React from 'react';

/** Props for FormField component providing standardized form field layout */
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Consistent form field wrapper component providing standardized layout,
 * labels, validation states, and help text for all form inputs.
 *
 * Error message takes precedence over help text when both are provided
 */
export function FormField({
  label,
  required = false,
  error,
  help,
  children,
  className = ''
}: FormFieldProps): JSX.Element {
  return (
    <div className={`form-field ${className}`}>
      <label className={`form-label ${required ? 'form-label-required' : ''}`}>
        {label}
      </label>
      {children}
      {/* Show help text only when no error is present */}
      {help && !error && (
        <p className="form-help">{help}</p>
      )}
      {error && (
        <p className="form-error" role="alert">{error}</p>
      )}
    </div>
  );
}

/** Props for Input component with validation state styling */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
}

/**
 * Styled input component with consistent appearance and validation states.
 */
export function Input({ error, success, className = '', ...props }: InputProps): JSX.Element {
  const baseClass = error ? 'input-error' : success ? 'input-success' : 'input';
  return (
    <input
      className={`${baseClass} ${className}`}
      {...props}
    />
  );
}

/** Props for TextArea component with validation state styling */
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  success?: boolean;
}

/**
 * Styled textarea component with consistent appearance and validation states.
 */
export function TextArea({ error, success, className = '', ...props }: TextAreaProps): JSX.Element {
  const baseClass = error ? 'input-error textarea' : success ? 'input-success textarea' : 'textarea';
  return (
    <textarea
      className={`${baseClass} ${className}`}
      {...props}
    />
  );
}

/**
 * NOTE: Native HTML <select> wrapper has been deprecated.
 * Use the standardized <Select> component from './Select.tsx' instead.
 *
 * The new Select component provides:
 * - Better cross-browser consistency
 * - Keyboard navigation
 * - Touch-friendly mobile interaction
 * - No mobile zoom issues
 *
 * Import as: import { Select } from '../shared';
 */

/** Props for FormRow component organizing fields into responsive columns */
interface FormRowProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Responsive form row for organizing fields into columns on larger screens.
 */
export function FormRow({ children, className = '' }: FormRowProps): JSX.Element {
  return (
    <div className={`form-row ${className}`}>
      {children}
    </div>
  );
}

/** Props for FormSection component with optional title and consistent spacing */
interface FormSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Form section with optional title and consistent spacing.
 */
export function FormSection({ title, children, className = '' }: FormSectionProps): JSX.Element {
  return (
    <div className={`form-section ${className}`}>
      {title && (
        <>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </h3>
          <div className="form-divider" />
        </>
      )}
      <div className="form-group">
        {children}
      </div>
    </div>
  );
}

/** Props for FormGroup component for logically related fields */
interface FormGroupProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Form group for logically related fields with consistent spacing.
 */
export function FormGroup({ children, className = '' }: FormGroupProps): JSX.Element {
  return (
    <div className={`form-group ${className}`}>
      {children}
    </div>
  );
}
