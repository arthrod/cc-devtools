/**
 * Test utilities and helpers
 */

import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

/**
 * Create a temporary test directory
 */
export function createTempDir(prefix = 'cc-devtools-test'): string {
  const dirName = `${prefix}-${randomBytes(8).toString('hex')}`;
  const tempPath = join(tmpdir(), dirName);
  mkdirSync(tempPath, { recursive: true });
  return tempPath;
}

/**
 * Clean up a temporary directory
 */
export function cleanupTempDir(path: string): void {
  if (existsSync(path)) {
    rmSync(path, { recursive: true, force: true });
  }
}

/**
 * Create a mock package.json for testing
 */
export function createMockPackageJson(dir: string, content?: Record<string, unknown>): void {
  const defaultContent = {
    name: 'test-project',
    version: '1.0.0',
    description: 'Test project'
  };
  const pkgContent = JSON.stringify(content || defaultContent, null, 2);
  writeFileSync(join(dir, 'package.json'), pkgContent, 'utf-8');
}

/**
 * Create a mock .mcp.json file
 */
export function createMockMcpJson(dir: string, content?: Record<string, unknown>): void {
  const defaultContent = {
    mcpServers: {}
  };
  const mcpContent = JSON.stringify(content || defaultContent, null, 2);
  writeFileSync(join(dir, '.mcp.json'), mcpContent, 'utf-8');
}

/**
 * Read JSON file
 */
export function readJsonFile<T = unknown>(filePath: string): T {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Create a mock .gitignore file
 */
export function createMockGitignore(dir: string, content?: string): void {
  const defaultContent = `node_modules/
dist/
.env`;
  writeFileSync(join(dir, '.gitignore'), content || defaultContent, 'utf-8');
}

/**
 * Wait for a specified amount of time (for async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Suppress console output during tests
 */
export function suppressConsole(): { restore: () => void } {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};

  return {
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  };
}

/**
 * Mock stdin for interactive prompt testing
 */
export function mockStdin(): {
  stdin: NodeJS.ReadStream & { isTTY: true };
  write: (data: string) => void;
  emitKeypress: (key: string) => void;
  restore: () => void;
} {
  const { Readable } = require('stream');
  const originalStdin = process.stdin;

  // Create a mock readable stream
  const mockStream = new Readable({
    read() {
      // No-op
    }
  }) as NodeJS.ReadStream & { isTTY: true; setRawMode: (mode: boolean) => void };

  // Make it look like a TTY
  mockStream.isTTY = true;
  mockStream.setRawMode = () => mockStream;

  // Replace process.stdin
  Object.defineProperty(process, 'stdin', {
    value: mockStream,
    writable: true,
    configurable: true
  });

  return {
    stdin: mockStream,

    // Write text (for simple prompts like confirm)
    write(data: string) {
      mockStream.push(data);
      mockStream.emit('data', data);
    },

    // Emit keyboard events (for multiSelect/select prompts)
    emitKeypress(key: string) {
      mockStream.emit('data', key);
    },

    // Restore original stdin
    restore() {
      Object.defineProperty(process, 'stdin', {
        value: originalStdin,
        writable: true,
        configurable: true
      });
    }
  };
}
