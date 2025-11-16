import { Plus } from 'lucide-react';
import { Button } from '../common/Button';

interface ConsoleHeaderProps {
  onNewTab: () => void;
}

/**
 * Header for the Console page.
 *
 * Features:
 * - "+" button to add new terminal sessions
 */
export function ConsoleHeader({ onNewTab }: ConsoleHeaderProps): JSX.Element {
  return (
    <div className="flex items-center justify-end px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <Button
        variant="primary"
        onClick={onNewTab}
        className="flex items-center gap-2"
        aria-label="Add new terminal session"
      >
        <Plus className="w-4 h-4" />
        <span>New Session</span>
      </Button>
    </div>
  );
}
