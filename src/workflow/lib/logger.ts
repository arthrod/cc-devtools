/**
 * Workflow logging utilities
 */

import { appendFileSync } from 'fs';

type LogLevel = 'info' | 'debug' | 'error';

export class WorkflowLogger {
  private logFile: string;
  private enabled: boolean;
  private level: LogLevel;

  constructor(logFile: string, enabled: boolean = true, level: LogLevel = 'info') {
    this.logFile = logFile;
    this.enabled = enabled;
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.enabled) return false;

    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      error: 2,
    };

    return levels[level] >= levels[this.level];
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();

    const logLine = `[${timestamp}] ${level.toUpperCase()}: ${message}${
      data ? ' ' + JSON.stringify(data, null, 2) : ''
    }\n`;

    try {
      appendFileSync(this.logFile, logLine);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to write to log file:', (err as Error).message);
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }
}
