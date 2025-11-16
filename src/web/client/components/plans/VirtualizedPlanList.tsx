import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { ListChecks } from 'lucide-react';
import type { Plan } from '../../../../web/shared/types/plans.js';
import { PlanCard } from './PlanCard.js';

interface VirtualizedPlanListProps {
  plans: Plan[];
  expandedPlanId: string | null;
  onTogglePlan: (planId: string) => void;
  onContextMenu: (e: React.MouseEvent, plan: Plan) => void;
  onTouchStart: (e: React.TouchEvent, plan: Plan) => void;
  onTouchEnd: () => void;
  onTouchMove: (e: React.TouchEvent) => void;
  header?: React.ReactNode;
}

/**
 * Virtualized plan list component that efficiently renders large lists
 * by only rendering visible items in the viewport.
 */
export function VirtualizedPlanList({
  plans,
  expandedPlanId,
  onTogglePlan,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
  onTouchMove,
  header,
}: VirtualizedPlanListProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: plans.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 5,
    getItemKey: (index) => plans[index]?.id ?? index,
  });

  const items = virtualizer.getVirtualItems();

  if (plans.length === 0) {
    return (
      <div ref={parentRef} className="h-full overflow-auto">
        {header}
        <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center space-y-4">
            <ListChecks size={64} className="mx-auto text-gray-300 dark:text-gray-700" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">No plans found</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Plans will appear here as conversations are stored
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      style={{ contain: 'strict' }}
    >
      {header}
      <div className="px-6 py-6">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
          className="max-w-7xl mx-auto"
        >
        {items.map((virtualItem) => {
          const plan = plans[virtualItem.index];
          if (!plan) return null;

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="mb-3"
            >
              <PlanCard
                plan={plan}
                isExpanded={expandedPlanId === plan.id}
                onToggleExpand={() => onTogglePlan(plan.id)}
                onContextMenu={(e) => onContextMenu(e, plan)}
                onTouchStart={(e) => onTouchStart(e, plan)}
                onTouchEnd={onTouchEnd}
                onTouchMove={onTouchMove}
              />
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
