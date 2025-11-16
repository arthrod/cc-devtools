/**
 * TypeScript declarations for VibeTunnel Lit web components
 *
 * These declarations allow using VibeTunnel's web components in React/TypeScript
 * without type errors.
 */

declare namespace JSX {
  interface IntrinsicElements {
    'vibe-terminal': VibeTerminalElement;
    'session-view': SessionViewElement;
    'session-list': SessionListElement;
  }
}

/**
 * VibeTunnel Terminal Component
 *
 * Renders terminal output using xterm.js with WebSocket connection to VibeTunnel backend.
 *
 * @example
 * ```tsx
 * <vibe-terminal
 *   session-id="session-123"
 *   cols={120}
 *   rows={30}
 *   font-size={14}
 *   theme="auto"
 * />
 * ```
 */
interface VibeTerminalElement extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> {
  /**
   * Session identifier to connect to
   */
  'session-id'?: string;

  /**
   * Terminal width in columns (default: 80)
   */
  cols?: number | string;

  /**
   * Terminal height in rows (default: 24)
   */
  rows?: number | string;

  /**
   * Font size in pixels (default: 14)
   */
  'font-size'?: number | string;

  /**
   * Terminal theme: 'auto', 'light', or 'dark' (default: 'auto')
   */
  theme?: 'auto' | 'light' | 'dark' | string;

  /**
   * Auto-fit terminal to container width
   */
  'fit-horizontally'?: boolean | string;

  /**
   * Maximum column width
   */
  'max-cols'?: number | string;

  /**
   * Event: Terminal initialized and ready
   */
  onTerminalReady?: (event: CustomEvent) => void;

  /**
   * Event: User typed input (detail: string)
   */
  onTerminalInput?: (event: CustomEvent<string>) => void;

  /**
   * Event: Terminal resized (detail: {cols: number, rows: number})
   */
  onTerminalResize?: (event: CustomEvent<{ cols: number; rows: number }>) => void;
}

/**
 * VibeTunnel Session View Component
 *
 * Full-screen terminal view with all VibeTunnel features (sidebar, file browser, etc.)
 */
interface SessionViewElement extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> {
  /**
   * Session object from VibeTunnel API
   */
  session?: unknown;

  /**
   * Show back navigation button
   */
  'show-back-button'?: boolean | string;

  /**
   * Show sidebar toggle button
   */
  'show-sidebar-toggle'?: boolean | string;

  /**
   * Initial sidebar collapsed state
   */
  'sidebar-collapsed'?: boolean | string;

  /**
   * Enable keyboard capture mode
   */
  'keyboard-capture-active'?: boolean | string;
}

/**
 * VibeTunnel Session List Component
 *
 * Displays list of all active terminal sessions
 */
interface SessionListElement extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> {
  /**
   * Array of session objects from VibeTunnel API
   */
  sessions?: unknown;
}

/**
 * VibeTunnel main app component (if needed)
 */
declare namespace JSX {
  interface IntrinsicElements {
    'vibetunnel-app': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
  }
}
