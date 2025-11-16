import { Clipboard, Plus, ArrowLeft } from 'lucide-react';
import { Button } from '../../shared/Button';
import { useKanbanStore } from '../../../stores/kanbanStore.js';
import type { Story } from '../../../../../kanban/types.js';

interface MobileSubtaskViewEmptyStateProps {
  story: Story;
  onAddSubtask: (story: Story) => void;
}

/**
 * Empty state component shown when viewing a story with 0 subtasks on mobile.
 * Provides clear actions: add a subtask or return to story view.
 */
export function MobileSubtaskViewEmptyState({ story, onAddSubtask }: MobileSubtaskViewEmptyStateProps): JSX.Element {
  const { exitSubtaskView } = useKanbanStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-12">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Clipboard className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
        No Subtasks Yet
      </h3>

      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-sm">
        This story doesn't have any subtasks. Add a subtask to break down the work or return to view all stories.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <Button
          variant="primary"
          onClick={() => onAddSubtask(story)}
          className="flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Subtask
        </Button>

        <Button
          variant="secondary"
          onClick={exitSubtaskView}
          className="flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Stories
        </Button>
      </div>
    </div>
  );
}
