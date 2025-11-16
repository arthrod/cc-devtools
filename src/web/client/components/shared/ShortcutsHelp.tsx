import { useState, forwardRef, useImperativeHandle } from 'react';
import { Keyboard } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import type { ShortcutCategory } from '../../types/keyboard';

export interface ShortcutsHelpRef {
  toggle: () => void;
}

/**
 * Available keyboard shortcuts grouped by category for the application.
 */
const shortcuts: ShortcutCategory[] = [
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['/'], description: 'Focus search' },
      { keys: ['Esc'], description: 'Close modals and overlays' },
      { keys: ['K'], description: 'Go to Kanban Board' },
      { keys: ['M'], description: 'Go to Memory Explorer' },
      { keys: ['P'], description: 'Go to Plans' },
      { keys: ['E'], description: 'Go to Editor' },
      { keys: ['C'], description: 'Go to Console' },
    ]
  },
  {
    category: 'Actions',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open command palette (Mac)' },
      { keys: ['Ctrl', 'K'], description: 'Open command palette (Windows/Linux)' },
      { keys: ['N'], description: 'Create new item' },
      { keys: ['⌘', 'S'], description: 'Save (in forms)' },
      { keys: ['Ctrl', 'S'], description: 'Save (in forms, Windows/Linux)' },
      { keys: ['⌘', 'Enter'], description: 'Submit (in forms)' },
      { keys: ['Ctrl', 'Enter'], description: 'Submit (in forms, Windows/Linux)' },
    ]
  },
  {
    category: 'Editor',
    shortcuts: [
      { keys: ['⌘', 'F'], description: 'Search in file' },
      { keys: ['Ctrl', 'F'], description: 'Search in file (Windows/Linux)' },
      { keys: ['⌘', 'H'], description: 'Find and replace' },
      { keys: ['Ctrl', 'H'], description: 'Find and replace (Windows/Linux)' },
      { keys: ['⌘', 'G'], description: 'Go to line' },
      { keys: ['Ctrl', 'G'], description: 'Go to line (Windows/Linux)' },
    ]
  }
];

/**
 * Renders a keyboard shortcuts help dialog that can be triggered from anywhere in the application.
 * Displays all available keyboard shortcuts organized by category in a modal overlay.
 */
export const ShortcutsHelp = forwardRef<ShortcutsHelpRef>((_, ref) => {
  const [isOpen, setIsOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    toggle: (): void => setIsOpen((prev) => !prev)
  }));

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="p-2"
        title="Keyboard shortcuts (?)"
        aria-label="Show keyboard shortcuts"
      >
        <Keyboard className="h-4 w-4" />
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Keyboard Shortcuts"
      >
        <div className="p-6">
          <div className="space-y-6">
            {shortcuts.map((category) => (
              <div key={category.category}>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {shortcut.description}
                      </span>
                      <div className="flex space-x-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <kbd
                            key={keyIndex}
                            className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Press <kbd className="px-1 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">?</kbd> at any time to show this help.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
});

ShortcutsHelp.displayName = 'ShortcutsHelp';
