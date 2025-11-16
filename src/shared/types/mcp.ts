/**
 * MCP server types
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolHandler {
  (args: Record<string, unknown> | undefined): Promise<unknown>;
}

export interface MCPServerConfig {
  name: string;
  version: string;
  tools: Tool[];
  handlers: Record<string, ToolHandler>;
}

export interface MCPErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
