import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  onToggle?: (expanded: boolean) => void;
}

export function CollapsibleSection({
  title,
  children,
  defaultExpanded = false,
  className,
  headerClassName,
  contentClassName,
  icon: Icon,
  badge,
  onToggle
}: CollapsibleSectionProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = (): void => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onToggle?.(newExpanded);
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={clsx('border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden', className)}>
      <button
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className={clsx(
          'w-full px-4 py-3 flex items-center justify-between',
          'bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750',
          'transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset',
          'text-left',
          headerClassName
        )}
        aria-expanded={isExpanded}
        aria-controls="collapsible-content"
      >
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {Icon && (
            <Icon className="h-5 w-5 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
          )}
          <span className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {title}
          </span>
          {badge && (
            <div className="flex-shrink-0">
              {badge}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 ml-2">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
          )}
        </div>
      </button>

      <div
        id="collapsible-content"
        className={clsx(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className={clsx(
          'px-4 py-3 border-t border-neutral-200 dark:border-neutral-700',
          'bg-neutral-25 dark:bg-neutral-850',
          contentClassName
        )}>
          {children}
        </div>
      </div>
    </div>
  );
}
