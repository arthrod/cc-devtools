import React from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
  width?: string;
  height?: string;
  animate?: boolean;
}

/**
 * Skeleton component for loading states
 * Shows placeholder elements while content is loading
 */
export function Skeleton({
  className,
  variant = 'rect',
  width,
  height,
  animate = true,
}: SkeletonProps): JSX.Element {
  return (
    <div
      className={clsx(
        'bg-gray-200 dark:bg-gray-700',
        {
          'rounded': variant === 'rect',
          'rounded-full': variant === 'circle',
          'rounded-sm h-4': variant === 'text',
          'animate-pulse': animate,
        },
        className
      )}
      style={{
        width: width ?? '100%',
        height: height ?? (variant === 'text' ? '1rem' : '100%'),
      }}
    />
  );
}

/**
 * Skeleton card that mimics a story card layout
 */
export function SkeletonCard(): JSX.Element {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      {/* Title */}
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="60%" />

      {/* Tags */}
      <div className="flex gap-2">
        <Skeleton variant="rect" width="60px" height="24px" />
        <Skeleton variant="rect" width="50px" height="24px" />
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-2">
        <Skeleton variant="text" width="40px" />
        <Skeleton variant="text" width="80px" />
      </div>
    </div>
  );
}

/**
 * Skeleton kanban column with multiple cards
 */
export function SkeletonKanbanColumn({ cardCount = 3 }: { cardCount?: number }): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {/* Column header */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width="120px" height="24px" />
        <Skeleton variant="circle" width="24px" height="24px" />
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {Array.from({ length: cardCount }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    </div>
  );
}
