import { NavLink } from 'react-router-dom';
import { Trello, Code, Terminal, ChevronLeft, ChevronRight, Database, FolderKanban, Moon, Sun, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../../stores/appStore';
import { Button } from '../shared/Button';
import { useScreenSize } from '../../hooks/useIsMobile';

interface SidebarProps {
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggle?: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    path: '/kanban',
    label: 'Kanban',
    icon: Trello
  },
  {
    path: '/plans',
    label: 'Plans',
    icon: FolderKanban
  },
  {
    path: '/memory',
    label: 'Memory',
    icon: Database
  },
  {
    path: '/file-runner',
    label: 'File Runner',
    icon: FileText
  },
  {
    path: '/editor',
    label: 'Editor',
    icon: Code
  },
  {
    path: '/console',
    label: 'Console',
    icon: Terminal
  }
];

/**
 * Application sidebar providing navigation between main features with collapsible layout.
 * Adapts visual presentation based on collapsed state while maintaining accessibility.
 */
export function Sidebar({ collapsed, onNavigate, onToggle }: SidebarProps): JSX.Element {
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const darkMode = useAppStore((state) => state.darkMode);
  const toggleDarkMode = useAppStore((state) => state.toggleDarkMode);
  const directoryName = useAppStore((state) => state.directoryName);
  const screenSize = useScreenSize();

  // On mobile/tablet, sidebar is NEVER collapsed - always full width
  const isMobileOrTablet = screenSize === 'mobile' || screenSize === 'tablet';
  const isCollapsed = isMobileOrTablet ? false : (collapsed ?? sidebarCollapsed);
  const projectName = directoryName ?? 'CC-DevTools';

  const handleNavClick = (): void => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <div
      className={clsx(
        'h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {isCollapsed ? (
          <img src="/logo-square.png" alt={projectName} className="w-8 h-8 flex-shrink-0 mx-auto" />
        ) : (
          <div className="flex items-center space-x-2">
            <img src="/logo-square.png" alt={projectName} className="w-8 h-8 flex-shrink-0" />
            <span className="font-semibold text-gray-900 dark:text-gray-100">{projectName}</span>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle ?? toggleSidebar}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                clsx(
                  'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100 border-l-2 border-primary-500'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100',
                  isCollapsed ? 'justify-center px-2' : 'justify-start space-x-3'
                )
              }
              aria-label={item.label}
              aria-current={({ isActive }: { isActive: boolean }) => isActive ? 'page' : undefined}
              title={isCollapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={clsx(
                      'h-5 w-5 flex-shrink-0 transition-colors',
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'
                    )}
                    aria-hidden="true"
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Dark mode toggle - always visible at bottom */}
      <div className="px-2 pb-2">
        <button
          onClick={toggleDarkMode}
          className={clsx(
            'w-full group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
            'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100',
            isCollapsed ? 'justify-center px-2' : 'justify-start space-x-3'
          )}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isCollapsed ? (darkMode ? 'Light mode' : 'Dark mode') : undefined}
        >
          {darkMode ? (
            <Sun className="h-5 w-5 flex-shrink-0 text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300" aria-hidden="true" />
          ) : (
            <Moon className="h-5 w-5 flex-shrink-0 text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300" aria-hidden="true" />
          )}
          {!isCollapsed && <span className="truncate">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className={clsx('text-xs text-gray-500 dark:text-gray-400', isCollapsed ? 'text-center' : '')}>
          {isCollapsed ? 'v0.1' : 'CC-DevTools v0.1.0'}
        </div>
      </div>
    </div>
  );
}
