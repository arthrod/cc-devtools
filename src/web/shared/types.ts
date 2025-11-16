/**
 * Web server configuration types
 */

export interface ConfigOverrides {
  port?: number;
  host?: string;
  ipWhitelist?: string[];
}

export interface ServerConfig {
  portStart: number;
  portRange: number;
  host: string;
}

export interface SecurityConfig {
  ipWhitelist: string[];
  rateLimit: RateLimitConfig;
}

export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
}

export interface SSEConfig {
  pingInterval: number;
}

export interface EditorConfig {
  maxFileSize: number;
}

export interface WebConfig {
  server: ServerConfig;
  security: SecurityConfig;
  sse: SSEConfig;
  editor: EditorConfig;
}

/**
 * Authentication types
 */

export interface AuthToken {
  token: string;
  createdAt: Date;
}

export interface AuthContext {
  authenticated: boolean;
  ip: string;
}

/**
 * API response types
 */

export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
  };
}

/**
 * Common error shape for caught exceptions
 */
export interface CaughtError {
  code?: string;
  message?: string;
}

/**
 * SSE event types
 */

export type SSEEventType = 'kanban_changed' | 'memory_changed' | 'plan_changed' | 'file_changed' | 'ping';

export interface SSEEvent {
  type: SSEEventType;
  data?: unknown;
}

/**
 * File API types
 */

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
}

export interface FileContent {
  path: string;
  content: string;
  language: string;
  size: number;
}

export interface FileContentRequest {
  path: string;
  content: string;
}

export interface FileContentResponse {
  path: string;
  content: string;
  encoding: string;
}

/**
 * IP Whitelist types
 */

export interface CIDRParseResult {
  ip: string;
  prefixLength: number;
}

/**
 * Logger types
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
