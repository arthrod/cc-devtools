import { useState, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../shared/ToastContainer';
import { LiveRegion } from '../shared/LiveRegion';
import { useKeyboard } from '../../hooks/useKeyboard';
import type { KeyboardShortcut } from '../../types/keyboard';
import type { ShortcutsHelpRef } from '../shared/ShortcutsHelp';
import type { ConsoleTab } from '../../../shared/types/console';

interface ConsoleMenuState {
  tabs: ConsoleTab[];
  activeTabId: string | null;
  onNewTab: () => void;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

/**
 * Main application layout with persistent sidebar navigation and header.
 * Used for all authenticated pages (Kanban, Editor, Console).
 * Supports mobile menu toggling for responsive design.
 */
export function AppLayout(): JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [consoleMenuState, setConsoleMenuState] = useState<ConsoleMenuState | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const shortcutsHelpRef = useRef<ShortcutsHelpRef>(null);

  // Console page needs non-scrollable main area
  const isConsolePage = location.pathname === '/console';

  const handleToggleMobileMenu = (): void => {
    setMobileMenuOpen((prev) => !prev);
  };

  const handleMobileNavClick = (): void => {
    setMobileMenuOpen(false);
  };

  // Global keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      callback: (): void => shortcutsHelpRef.current?.toggle()
    },
    {
      key: '/',
      description: 'Focus search',
      callback: (): void => {
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    },
    {
      key: 'k',
      meta: true,
      description: 'Open command palette (Mac)',
      callback: (): void => {
        // Command palette not yet implemented
        console.log('Command palette shortcut triggered (Cmd+K)');
      }
    },
    {
      key: 'k',
      ctrl: true,
      description: 'Open command palette (Windows/Linux)',
      callback: (): void => {
        // Command palette not yet implemented
        console.log('Command palette shortcut triggered (Ctrl+K)');
      }
    },
    {
      key: 'Escape',
      description: 'Close modals and overlays',
      callback: (): void => {
        const closeButtons = document.querySelectorAll('[data-close-modal]');
        if (closeButtons.length > 0) {
          (closeButtons[0] as HTMLElement).click();
        }
        setMobileMenuOpen(false);
      }
    },
    {
      key: 'k',
      description: 'Go to Kanban Board',
      callback: (): void => navigate('/kanban')
    },
    {
      key: 'm',
      description: 'Go to Memory Explorer',
      callback: (): void => navigate('/memory')
    },
    {
      key: 'p',
      description: 'Go to Plans',
      callback: (): void => navigate('/plans')
    },
    {
      key: 'e',
      description: 'Go to Editor',
      callback: (): void => navigate('/editor')
    },
    {
      key: 'c',
      description: 'Go to Console',
      callback: (): void => navigate('/console')
    }
  ];

  useKeyboard(shortcuts);

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900 fixed inset-0">
      {/* Skip navigation links for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        Skip to main content
      </a>
      <a
        href="#sidebar-navigation"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-48 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md focus:shadow-lg"
      >
        Skip to navigation
      </a>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={handleToggleMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar-navigation"
        role="navigation"
        aria-label="Main navigation"
        className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          w-[280px] lg:w-auto
          transform transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar onNavigate={handleMobileNavClick} />
      </aside>

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <Header
          ref={shortcutsHelpRef}
          onToggleMobileMenu={handleToggleMobileMenu}
          consoleMenuProps={isConsolePage ? consoleMenuState ?? undefined : undefined}
        />
        <main id="main-content" className={`flex-1 min-h-0 ${isConsolePage ? 'overflow-hidden' : 'overflow-auto'}`} role="main" aria-label="Main content">
          <Outlet context={{ setConsoleMenuState }} />
        </main>
      </div>

      {/* Toast notifications */}
      <ToastContainer />

      {/* ARIA live region for screen reader announcements */}
      <LiveRegion />
    </div>
  );
}
