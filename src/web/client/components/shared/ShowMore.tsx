import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Configuration for content expansion behavior and visual customization
 */
interface ShowMoreProps {
  children: React.ReactNode;
  maxLines?: number;
  maxHeight?: number;
  showMoreText?: string;
  showLessText?: string;
  className?: string;
  contentClassName?: string;
  buttonClassName?: string;
  showIcon?: boolean;
  variant?: 'text' | 'fade' | 'cut';
}

/**
 * Progressive disclosure component for managing long content with show/hide functionality.
 * Supports line-based or height-based truncation with smooth animations.
 */
export function ShowMore({
  children,
  maxLines = 3,
  maxHeight,
  showMoreText = 'Show more',
  showLessText = 'Show less',
  className,
  contentClassName,
  buttonClassName,
  showIcon = true,
  variant = 'fade'
}: ShowMoreProps): JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = (): void => {
    setIsExpanded(!isExpanded);
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleExpanded();
    }
  };

  const getContentClasses = (): string => {
    if (isExpanded) {
      return '';
    }

    if (maxHeight) {
      return clsx(
        'overflow-hidden transition-all duration-300',
        `max-h-[${maxHeight}px]`,
        variant === 'fade' && 'relative'
      );
    }

    const lineClampClass = `line-clamp-${maxLines}`;
    return clsx(
      'overflow-hidden',
      variant === 'text' && lineClampClass,
      variant === 'fade' && 'relative'
    );
  };

  const getFadeOverlay = (): React.ReactNode => {
    if (variant !== 'fade' || isExpanded) {
      return null;
    }

    return (
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-neutral-900 to-transparent pointer-events-none" />
    );
  };

  return (
    <div className={clsx('relative', className)}>
      <div
        className={clsx(
          getContentClasses(),
          contentClassName
        )}
        style={maxHeight && !isExpanded ? { maxHeight: `${maxHeight}px` } : undefined}
      >
        {children}
        {getFadeOverlay()}
      </div>

      <button
        onClick={toggleExpanded}
        onKeyDown={handleKeyDown}
        className={clsx(
          'inline-flex items-center mt-2 px-2 py-1 text-sm font-medium',
          'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          'rounded transition-colors duration-200',
          buttonClassName
        )}
        aria-expanded={isExpanded}
      >
        <span>{isExpanded ? showLessText : showMoreText}</span>
        {showIcon && (
          <span className="ml-1">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        )}
      </button>
    </div>
  );
}

/**
 * Configuration for paginated list display with incremental loading
 */
interface ShowMoreListProps<T> {
  items: T[];
  initialCount?: number;
  incrementCount?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  showMoreText?: string;
  showLessText?: string;
  className?: string;
  listClassName?: string;
  buttonClassName?: string;
}

/**
 * Displays arrays with incremental loading behavior, managing visibility state
 * and providing controls to load more items or reset to initial count
 */
export function ShowMoreList<T>({
  items,
  initialCount = 5,
  incrementCount = 5,
  renderItem,
  showMoreText = 'Show more',
  showLessText = 'Show all',
  className,
  listClassName,
  buttonClassName
}: ShowMoreListProps<T>): JSX.Element {
  const [showCount, setShowCount] = useState(initialCount);
  const [showAll, setShowAll] = useState(false);

  const visibleItems = showAll ? items : items.slice(0, showCount);
  const hasMore = !showAll && showCount < items.length;
  const canShowLess = showAll || showCount > initialCount;

  const handleShowMore = (): void => {
    if (showCount + incrementCount >= items.length) {
      setShowAll(true);
    } else {
      setShowCount(showCount + incrementCount);
    }
  };

  const handleShowLess = (): void => {
    setShowCount(initialCount);
    setShowAll(false);
  };

  return (
    <div className={className}>
      <div className={listClassName}>
        {visibleItems.map((item, index) => renderItem(item, index))}
      </div>

      {(hasMore || canShowLess) && (
        <div className="mt-4 flex gap-2">
          {hasMore && (
            <button
              onClick={handleShowMore}
              className={clsx(
                'inline-flex items-center px-3 py-2 text-sm font-medium',
                'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300',
                'border border-primary-200 dark:border-primary-800 rounded-lg',
                'hover:bg-primary-50 dark:hover:bg-primary-900/20',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'transition-colors duration-200',
                buttonClassName
              )}
            >
              {showMoreText}
              <ChevronDown className="ml-1 h-4 w-4" />
            </button>
          )}

          {canShowLess && (
            <button
              onClick={handleShowLess}
              className={clsx(
                'inline-flex items-center px-3 py-2 text-sm font-medium',
                'text-neutral-600 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300',
                'border border-neutral-200 dark:border-neutral-700 rounded-lg',
                'hover:bg-neutral-50 dark:hover:bg-neutral-800',
                'focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2',
                'transition-colors duration-200',
                buttonClassName
              )}
            >
              {showLessText}
              <ChevronUp className="ml-1 h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
