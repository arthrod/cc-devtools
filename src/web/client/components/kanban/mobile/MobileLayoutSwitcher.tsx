import { useState, useRef, useEffect } from 'react';
import { List, MoreHorizontal, Columns, ChevronDown } from 'lucide-react';
import { Button } from '../../shared/Button';

export type MobileLayoutMode = 'list' | 'tabs' | 'swipe';

export interface MobileLayoutSwitcherProps {
  currentLayout: MobileLayoutMode;
  onLayoutChange: (layout: MobileLayoutMode) => void;
}

/**
 * Mobile layout switcher for kanban board views.
 * Dropdown selector to switch between List, Tab, and Swipe view modes.
 */
export function MobileLayoutSwitcher({ currentLayout, onLayoutChange }: MobileLayoutSwitcherProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const layouts = [
    {
      id: 'list' as const,
      label: 'List View',
      icon: List,
      description: 'Single column with status chips'
    },
    {
      id: 'tabs' as const,
      label: 'Tab View',
      icon: MoreHorizontal,
      description: 'Status-based tabs with swipe'
    },
    {
      id: 'swipe' as const,
      label: 'Swipe View',
      icon: Columns,
      description: 'Horizontal scrolling columns'
    },
  ];

  const currentLayoutData = layouts.find(l => l.id === currentLayout);
  const CurrentIcon = currentLayoutData?.icon ?? List;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLayoutSelect = (layoutId: MobileLayoutMode): void => {
    onLayoutChange(layoutId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-1.5"
        title={currentLayoutData?.label}
      >
        <CurrentIcon className="w-5 h-5" />
        <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 z-10 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg w-32">
          {layouts.map((layout) => {
            const Icon = layout.icon;
            const isActive = currentLayout === layout.id;

            return (
              <Button
                key={layout.id}
                variant="ghost"
                onClick={() => handleLayoutSelect(layout.id)}
                className={`
                  w-full flex items-center space-x-2 px-3 py-2 justify-start text-sm h-auto rounded-none
                  ${isActive ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' : ''}
                `}
                title={layout.description}
              >
                <Icon className="w-4 h-4" />
                <span>{layout.label}</span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
