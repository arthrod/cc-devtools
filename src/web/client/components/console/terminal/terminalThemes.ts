/**
 * Terminal Themes
 *
 * Salmon-branded terminal themes for xterm.js.
 * Includes both light and dark variants with brand color integration.
 *
 * Brand color: #f16b5a (salmon) - used for cursor and selection
 */

import type { TerminalTheme } from '@/web/shared/types/console';
import type { ITheme } from '@xterm/xterm';

/**
 * Dark theme with salmon branding
 * Based on VS Code Dark with salmon cursor and selection
 */
export const darkTheme: TerminalTheme = {
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  cursor: '#f16b5a',
  cursorAccent: '#1e1e1e',
  selectionBackground: '#f16b5a40',

  // ANSI colors (standard terminal palette)
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',

  // Bright variants
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#ffffff',
};

/**
 * Light theme with salmon branding
 * Clean white background with salmon cursor and selection
 */
export const lightTheme: TerminalTheme = {
  background: '#ffffff',
  foreground: '#1f2328',
  cursor: '#f16b5a',
  cursorAccent: '#ffffff',
  selectionBackground: '#f16b5a20',

  // ANSI colors (adjusted for light background)
  black: '#24292f',
  red: '#cf222e',
  green: '#1a7f37',
  yellow: '#9a6700',
  blue: '#0969da',
  magenta: '#8250df',
  cyan: '#1b7c83',
  white: '#6e7781',

  // Bright variants
  brightBlack: '#57606a',
  brightRed: '#da3633',
  brightGreen: '#2da44e',
  brightYellow: '#bf8700',
  brightBlue: '#218bff',
  brightMagenta: '#a475f9',
  brightCyan: '#3192aa',
  brightWhite: '#8c959f',
};

/**
 * Convert TerminalTheme to xterm.js ITheme format
 */
export function convertToXtermTheme(theme: TerminalTheme): ITheme {
  return {
    background: theme.background,
    foreground: theme.foreground,
    cursor: theme.cursor,
    cursorAccent: theme.cursorAccent,
    selectionBackground: theme.selectionBackground,
    selectionForeground: undefined,
    selectionInactiveBackground: undefined,

    // ANSI colors
    black: theme.black,
    red: theme.red,
    green: theme.green,
    yellow: theme.yellow,
    blue: theme.blue,
    magenta: theme.magenta,
    cyan: theme.cyan,
    white: theme.white,

    // Bright colors
    brightBlack: theme.brightBlack,
    brightRed: theme.brightRed,
    brightGreen: theme.brightGreen,
    brightYellow: theme.brightYellow,
    brightBlue: theme.brightBlue,
    brightMagenta: theme.brightMagenta,
    brightCyan: theme.brightCyan,
    brightWhite: theme.brightWhite,
  };
}

/**
 * Get theme based on mode ('light' or 'dark')
 */
export function getTheme(mode: 'light' | 'dark'): TerminalTheme {
  return mode === 'light' ? lightTheme : darkTheme;
}

/**
 * Get xterm.js theme based on mode
 */
export function getXtermTheme(mode: 'light' | 'dark'): ITheme {
  const theme = getTheme(mode);
  return convertToXtermTheme(theme);
}
