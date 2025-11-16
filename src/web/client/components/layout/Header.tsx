import { forwardRef, useState, useRef, useEffect } from 'react';
import { Moon, Sun, Menu, ChevronDown, Plus, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';
import { ShortcutsHelp, type ShortcutsHelpRef } from '../shared/ShortcutsHelp';
import { Button } from '../shared/Button';
import type { ConsoleTab } from '../../../shared/types/console';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  consoleMenuProps?: {
    tabs: ConsoleTab[];
    activeTabId: string | null;
    onNewTab: () => void;
    onSelectTab: (id: string) => void;
    onCloseTab: (id: string) => void;
  };
}

const routeToSectionName: Record<string, string> = {
  '/kanban': 'Kanban',
  '/plans': 'Plans',
  '/memory': 'Memory',
  '/editor': 'Editor',
  '/console': 'Console',
  '/file-runner': 'File Runner',
};

/**
 * Main application header providing project context and quick access to tools.
 * Adapts layout for mobile devices and displays current project and section.
 * On console page (mobile only), shows a dropdown menu for tabs and new session.
 */
export const Header = forwardRef<ShortcutsHelpRef, HeaderProps>(({ onToggleMobileMenu, consoleMenuProps }, shortcutsHelpRef) => {
  const { darkMode, toggleDarkMode, directoryName } = useAppStore();
  const location = useLocation();
  const [consoleMenuOpen, setConsoleMenuOpen] = useState(false);
  const consoleMenuRef = useRef<HTMLDivElement>(null);

  const sectionName = routeToSectionName[location.pathname] ?? 'CC-DevTools';
  const projectName = directoryName ?? 'CC-DevTools';
  const displayTitle = `${projectName} - ${sectionName}`;
  const isConsolePage = location.pathname === '/console';

  // Close console menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (consoleMenuRef.current && !consoleMenuRef.current.contains(event.target as Node)) {
        setConsoleMenuOpen(false);
      }
    };

    if (consoleMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [consoleMenuOpen]);

  const activeTab = consoleMenuProps?.tabs.find((tab) => tab.id === consoleMenuProps.activeTabId);

  return (
    <header role="banner" className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 lg:px-6 py-2 lg:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 lg:space-x-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleMobileMenu}
            className="lg:hidden -ml-2"
            aria-label="Open navigation menu"
            title="Open Menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>

          <h1 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[180px] sm:max-w-none">
            {displayTitle}
          </h1>
        </div>

        <div className="flex items-center space-x-1 lg:space-x-3">
          {/* Console menu dropdown on mobile */}
          {isConsolePage && consoleMenuProps && (
            <div className="lg:hidden relative" ref={consoleMenuRef}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConsoleMenuOpen(!consoleMenuOpen)}
                className="flex items-center gap-1"
                aria-label="Console menu"
              >
                <span className="text-sm truncate max-w-[100px]">
                  {activeTab?.name ?? 'Sessions'}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform ${consoleMenuOpen ? 'rotate-180' : ''}`} />
              </Button>

              {consoleMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        consoleMenuProps.onNewTab();
                        setConsoleMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-md transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      <span>New Session</span>
                    </button>
                  </div>

                  {consoleMenuProps.tabs.length > 0 && (
                    <>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                      <div className="p-2 space-y-1">
                        {consoleMenuProps.tabs.map((tab) => (
                          <div
                            key={tab.id}
                            className={`group flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                              tab.id === consoleMenuProps.activeTabId
                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                            }`}
                          >
                            <button
                              onClick={() => {
                                consoleMenuProps.onSelectTab(tab.id);
                                setConsoleMenuOpen(false);
                              }}
                              className="flex-1 text-left text-sm truncate"
                            >
                              {tab.name}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                consoleMenuProps.onCloseTab(tab.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-opacity"
                              aria-label={`Close ${tab.name}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="hidden lg:block">
            <ShortcutsHelp ref={shortcutsHelpRef} />
          </div>
          <div className="hidden lg:block">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleDarkMode}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={darkMode}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
