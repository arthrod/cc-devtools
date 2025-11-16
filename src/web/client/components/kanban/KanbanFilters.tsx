import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { Button } from '../common/Button';
import { Chip } from '../shared';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import type { Story } from '../../../../kanban/types.js';

interface KanbanFiltersProps {
  availableTags: string[];
  storiesForCounts: Story[];
}

interface TagWithCount {
  tag: string;
  count: number;
}

/**
 * Filter bar for kanban board with tag filtering.
 * Shows tags with frequency counts in a single row, with "see more" toggle on the right.
 * Tag counts cascade from current search and phase filters.
 */
export function KanbanFilters({ availableTags, storiesForCounts }: KanbanFiltersProps): JSX.Element {
  const { selectedTags, toggleTag, clearFilters } = useUIStore();
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(Infinity);

  const containerRef = useRef<HTMLDivElement>(null); // Outer container - stable width
  const visibleTagsContainerRef = useRef<HTMLDivElement>(null); // The actual div where visible tags render
  const tagsContainerRef = useRef<HTMLDivElement>(null); // Hidden measurement div
  const clearButtonRef = useRef<HTMLButtonElement>(null);
  const seeMoreButtonRef = useRef<HTMLButtonElement>(null);

  const hasActiveFilters = selectedTags.length > 0;

  // Calculate tag frequencies from filtered stories (cascading counts)
  const tagsWithCounts = useMemo((): TagWithCount[] => {
    const tagCounts = new Map<string, number>();

    storiesForCounts.forEach((story) => {
      story.labels?.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      });
    });

    return availableTags
      .map((tag) => ({
        tag,
        count: tagCounts.get(tag) ?? 0,
      }))
      .filter((item) => item.count > 0); // Only show tags that are actually used
  }, [storiesForCounts, availableTags]);

  // Sort by frequency (descending) when collapsed, alphabetically when expanded
  const sortedTags = useMemo((): TagWithCount[] => {
    return tagsExpanded
      ? [...tagsWithCounts].sort((a, b) => a.tag.localeCompare(b.tag))
      : [...tagsWithCounts].sort((a, b) => b.count - a.count);
  }, [tagsWithCounts, tagsExpanded]);

  // Calculate how many tags fit in available space
  const calculateVisibleTags = useCallback(() => {
    if (tagsExpanded || !containerRef.current || !tagsContainerRef.current) {
      setVisibleCount(Infinity);
      return;
    }

    const gap = 8; // gap-2 = 0.5rem = 8px

    // Measure the outer container (stable width) and subtract reserved space
    const containerWidth = containerRef.current.getBoundingClientRect().width;

    if (!containerWidth) {
      return;
    }

    // Calculate reserved space for clear button
    const reserved = hasActiveFilters && clearButtonRef.current
      ? clearButtonRef.current.getBoundingClientRect().width + gap
      : 0;

    const availableWidth = Math.max(containerWidth - reserved, 0);

    // Measure each tag chip to see how many fit WITHOUT reserving space for "see more"
    const tagElements = Array.from(tagsContainerRef.current.children) as HTMLElement[];

    let currentWidth = 0;
    let count = 0;

    for (let i = 0; i < tagElements.length && i < sortedTags.length; i++) {
      const tagWidth = tagElements[i]?.offsetWidth ?? 0;
      if (!tagWidth) continue;

      const widthWithGap = currentWidth + tagWidth + (count > 0 ? gap : 0);

      if (widthWithGap <= availableWidth) {
        currentWidth += tagWidth + (count > 0 ? gap : 0);
        count++;
      } else {
        break;
      }
    }

    // If not all tags fit, we need to reserve space for "see more" button
    if (count < sortedTags.length) {
      // Measure actual "see more" button width from hidden ref, or use fallback
      const seeMoreWidth = seeMoreButtonRef.current?.offsetWidth ?? 100;
      const availableWithButton = availableWidth - seeMoreWidth - gap;

      // Recalculate how many tags fit with button space reserved
      currentWidth = 0;
      count = 0;

      for (let i = 0; i < tagElements.length && i < sortedTags.length; i++) {
        const tagWidth = tagElements[i]?.offsetWidth ?? 0;
        if (!tagWidth) continue;

        const widthWithGap = currentWidth + tagWidth + (count > 0 ? gap : 0);

        if (widthWithGap <= availableWithButton) {
          currentWidth += tagWidth + (count > 0 ? gap : 0);
          count++;
        } else {
          break;
        }
      }
    }

    // Only update if count actually changed to prevent render loops
    setVisibleCount(prev => prev !== count ? count : prev);
  }, [sortedTags.length, tagsExpanded, hasActiveFilters]);

  // Recalculate when tags or container changes
  useEffect(() => {
    // Use RAF to ensure DOM has updated
    requestAnimationFrame(() => {
      calculateVisibleTags();
    });
  }, [calculateVisibleTags, sortedTags]);

  // Use ResizeObserver to recalculate on outer container resize (window resize, layout changes)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        calculateVisibleTags();
      });
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateVisibleTags]);

  // Show appropriate tags based on expanded state and visible count
  const visibleTags = tagsExpanded ? sortedTags : sortedTags.slice(0, visibleCount);
  const hasMoreTags = !tagsExpanded && sortedTags.length > visibleCount;

  return (
    <>
      {tagsWithCounts.length > 0 && (
        <>
          {/* Hidden measurement container - renders all tags and see more button for sizing */}
          <div className="fixed opacity-0 pointer-events-none -z-50" aria-hidden="true">
            <div ref={tagsContainerRef} className="flex items-center gap-2">
              {sortedTags.map(({ tag, count }) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Chip
                    key={tag}
                    label={`${tag} (${count})`}
                    variant={isSelected ? 'danger' : 'default'}
                    size="sm"
                    className="whitespace-nowrap flex-shrink-0"
                  />
                );
              })}
            </div>
            {/* Measure "see more" button */}
            <Button
              ref={seeMoreButtonRef}
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 flex-shrink-0 text-red-600 dark:text-red-400"
            >
              <span>see more</span>
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
            </Button>
          </div>

          {/* Visible filter bar */}
          <div ref={containerRef} className={`flex w-full items-start gap-2 mt-2 ${tagsExpanded ? '' : 'overflow-hidden'}`}>
            {/* Clear filter button */}
            {hasActiveFilters && (
              <Button
                ref={clearButtonRef}
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="flex items-center space-x-1 flex-shrink-0"
              >
                <X className="h-3 w-3" />
                <span>Clear</span>
              </Button>
            )}

            {/* Tags - single row when collapsed, multi-row when expanded */}
            <div ref={visibleTagsContainerRef} className={`flex min-w-0 flex-1 items-center gap-2 ${tagsExpanded ? 'flex-wrap' : 'overflow-hidden'}`}>
              {visibleTags.map(({ tag, count }) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <Chip
                    key={tag}
                    label={`${tag} (${count})`}
                    variant={isSelected ? 'danger' : 'default'}
                    size="sm"
                    onClick={() => toggleTag(tag)}
                    aria-label={`${isSelected ? 'Remove' : 'Add'} filter for tag ${tag} (${count} ${count === 1 ? 'story' : 'stories'})`}
                    aria-pressed={isSelected}
                    className="whitespace-nowrap flex-shrink-0"
                  />
                );
              })}

              {/* Spacer to push "see more" button to the right when collapsed */}
              {!tagsExpanded && hasMoreTags && (
                <div className="flex-1" />
              )}

              {/* See more button - right-aligned when collapsed */}
              {hasMoreTags && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTagsExpanded(true)}
                  className="flex items-center gap-1 flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 pr-0"
                  aria-label="Show more tags"
                  aria-expanded={false}
                >
                  <span>see more</span>
                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                </Button>
              )}

              {/* Show less button when expanded */}
              {tagsExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTagsExpanded(false)}
                  className="flex items-center gap-1 flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  aria-label="Show fewer tags"
                  aria-expanded={true}
                >
                  <span>show less</span>
                  <ChevronUp className="h-3 w-3" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
