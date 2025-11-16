import { Terminal } from 'lucide-react';
import { useState } from 'react';

import { CustomTerminal } from './terminal/CustomTerminal';

interface ConsoleContentProps {
  sessionId: string | null;
}

/**
 * Container for the terminal display.
 *
 * Integrates custom xterm.js terminal with WebSocket connectivity.
 *
 * Features:
 * - xterm.js terminal with salmon branding
 * - WebSocket I/O via VibeTunnel backend
 * - Mobile on-screen keyboard
 * - Desktop keyboard capture
 * - Connection status indicator
 * - Dark/light theme support
 */
export function ConsoleContent({ sessionId }: ConsoleContentProps): JSX.Element {
  const [isTerminalReady, setIsTerminalReady] = useState(false);

  if (!sessionId) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <Terminal
            size={64}
            className="mx-auto text-gray-300 dark:text-gray-700"
          />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No active terminal session
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            Click "New Session" to create or connect to a terminal
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-black relative">
      {!isTerminalReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="text-center space-y-2">
            <Terminal size={48} className="mx-auto text-gray-600 animate-pulse" />
            <p className="text-gray-400 text-sm">Connecting to terminal...</p>
          </div>
        </div>
      )}

      <CustomTerminal
        sessionId={sessionId}
        onTerminalReady={() => setIsTerminalReady(true)}
        onTerminalInput={(input) => {
          console.log('[ConsoleContent] Terminal input:', input);
        }}
        onTerminalResize={(size) => {
          console.log('[ConsoleContent] Terminal resized:', size);
        }}
      />
    </div>
  );
}
