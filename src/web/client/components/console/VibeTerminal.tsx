import { useEffect, useRef, useState } from 'react';

interface VibeTerminalProps {
  /**
   * Session ID to connect terminal to
   */
  sessionId: string;

  /**
   * Callback when terminal is ready
   */
  onTerminalReady?: () => void;

  /**
   * Callback when user types in terminal
   */
  onTerminalInput?: (input: string) => void;

  /**
   * Callback when terminal is resized
   */
  onTerminalResize?: (size: { cols: number; rows: number }) => void;
}

interface VibeSession {
  id: string;
  name: string;
  status: string;
  workingDir?: string;
  command?: string[];
  [key: string]: unknown;
}

/**
 * VibeTerminal Component
 *
 * React wrapper for VibeTunnel's `<session-view>` web component.
 * Uses session-view instead of vibe-terminal to get automatic WebSocket
 * connection management and buffer subscription.
 *
 * @example
 * ```tsx
 * <VibeTerminal sessionId="session-123" />
 * ```
 */
export function VibeTerminal({
  sessionId,
  onTerminalReady,
  onTerminalInput,
  onTerminalResize,
}: VibeTerminalProps) {
  const sessionViewRef = useRef<HTMLElement>(null);
  const [session, setSession] = useState<VibeSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch the full session object from VibeTunnel's API
  useEffect(() => {
    if (!sessionId) return;

    const fetchSession = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch session: ${response.status}`);
        }
        const sessionData = await response.json() as VibeSession;
        setSession(sessionData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load session';
        setError(errorMessage);
        console.error('[VibeTerminal] Failed to fetch session:', err);
      }
    };

    void fetchSession();
  }, [sessionId]);

  // Assign session object to the session-view element
  useEffect(() => {
    const element = sessionViewRef.current;
    if (!element || !session) return;

    // Assign the session object via property (not attribute)
    // This triggers the lifecycle manager and WebSocket connection
    (element as { session: VibeSession }).session = session;

    console.log('[VibeTerminal] Session assigned to session-view:', session.id);
  }, [session]);

  // Set up event listeners for callbacks
  useEffect(() => {
    const element = sessionViewRef.current;
    if (!element) return;

    const handleReady = (): void => {
      console.log('[VibeTerminal] Terminal ready');
      onTerminalReady?.();
    };

    const handleInput = (event: Event): void => {
      const customEvent = event as CustomEvent<string>;
      onTerminalInput?.(customEvent.detail);
    };

    const handleResize = (event: Event): void => {
      const customEvent = event as CustomEvent<{ cols: number; rows: number }>;
      onTerminalResize?.(customEvent.detail);
    };

    element.addEventListener('terminal-ready', handleReady);
    element.addEventListener('terminal-input', handleInput);
    element.addEventListener('terminal-resize', handleResize);

    return () => {
      element.removeEventListener('terminal-ready', handleReady);
      element.removeEventListener('terminal-input', handleInput);
      element.removeEventListener('terminal-resize', handleResize);
    };
  }, [onTerminalReady, onTerminalInput, onTerminalResize]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-red-400">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Terminal Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-gray-400">
        <div className="text-center">
          <p className="text-sm">Loading terminal session...</p>
        </div>
      </div>
    );
  }

  return (
    <session-view
      ref={sessionViewRef}
      show-back-button={false}
      show-sidebar-toggle={false}
      keyboard-capture-active={true}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    />
  );
}
