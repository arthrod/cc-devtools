import { ArrowLeft, X } from 'lucide-react';
import { useKanbanStore } from '../../../stores/kanbanStore.js';
import type { Story } from '../../../../../kanban/types.js';

interface MobileSubtaskViewHeaderProps {
  story: Story;
}

/**
 * Context header chip shown when viewing a story's subtasks on mobile.
 * Provides navigation back to Story view and shows current story context.
 */
export function MobileSubtaskViewHeader({ story }: MobileSubtaskViewHeaderProps): JSX.Element {
  const { exitSubtaskView } = useKanbanStore();

  return (
    <div className="sticky top-0 z-10 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={exitSubtaskView}
          className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 rounded-lg bg-white dark:bg-neutral-800 border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-left">
            <div className="text-xs text-gray-500 dark:text-gray-400">Story</div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {story.id} - {story.title}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={exitSubtaskView}
          className="flex-shrink-0 p-2 rounded-lg bg-white dark:bg-neutral-800 border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors"
          aria-label="Close subtask view"
        >
          <X className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </button>
      </div>
    </div>
  );
}
