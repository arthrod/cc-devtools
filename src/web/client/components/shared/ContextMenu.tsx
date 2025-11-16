import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { adjustPositionToViewport } from '../../utils/positioning';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
  divider?: boolean;
  customContent?: React.ReactNode; // For inline controls like font size
}

interface ContextMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

/**
 * Context menu component (right-click menu)
 *
 * Usage:
 * ```tsx
 * <ContextMenu
 *   isOpen={isOpen}
 *   x={mouseX}
 *   y={mouseY}
 *   items={[
 *     { label: 'Rename', icon: <Pencil />, onClick: handleRename },
 *     { label: 'Delete', icon: <Trash />, onClick: handleDelete, variant: 'danger' },
 *   ]}
 *   onClose={() => setIsOpen(false)}
 * />
 * ```
 */
export function ContextMenu({
  isOpen,
  x,
  y,
  items,
  onClose,
}: ContextMenuProps): React.ReactPortal | null {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Delay adding listeners to avoid immediate close from the same click that opened the menu
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return (): void => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Adjust position if menu goes off-screen
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();

    // Use shared positioning utility
    const adjusted = adjustPositionToViewport(x, y, rect);

    menu.style.left = `${adjusted.x}px`;
    menu.style.top = `${adjusted.y}px`;
  }, [isOpen, x, y]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[160px]"
      style={{ left: x, top: y }}
      role="menu"
    >
      {items.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={`divider-${index}`}
              className="border-t border-gray-200 dark:border-gray-700 my-1"
            />
          );
        }

        // Custom content item (e.g., font size with +/- buttons)
        if (item.customContent) {
          return (
            <div
              key={index}
              className="px-4 py-2 text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300"
              role="menuitem"
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
              {item.customContent}
            </div>
          );
        }

        return (
          <button
            key={index}
            type="button"
            className={`
              w-full text-left px-4 py-2 text-sm flex items-center gap-2
              transition-colors
              ${
                item.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : item.variant === 'danger'
                    ? 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }
            `}
            onClick={() => {
              if (!item.disabled && item.onClick) {
                item.onClick();
                onClose();
              }
            }}
            disabled={item.disabled}
            role="menuitem"
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span className="flex-1">{item.label}</span>
          </button>
        );
      })}
    </div>,
    document.body
  );
}
