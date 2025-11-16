/**
 * MCP Server Utilities
 * Shared utilities for creating and managing MCP servers
 */


import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { isCCDevToolsError } from './errors.js';

import type { MCPServerConfig, MCPErrorResponse } from './types/mcp.js';

/**
 * Format error response with structured error information
 */
export function formatErrorResponse(error: unknown): MCPErrorResponse {
  if (isCCDevToolsError(error)) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: false,
    error: String(error),
  };
}

/**
 * Format MCP response with proper JSON stringification
 */
export function formatMCPResponse(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Create an MCP server with standardized setup
 */
export function createMCPServer(config: MCPServerConfig): Server {
  const { name, version, tools, handlers } = config;

  const server = new Server(
    {
      name,
      version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register list tools handler
  server.setRequestHandler(ListToolsRequestSchema, () => {
    return { tools };
  });

  // Register call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name: toolName, arguments: args } = request.params;

    // Find handler
    const handler = handlers[toolName];
    if (!handler) {
      const errorResponse = formatErrorResponse(new Error(`Unknown tool: ${toolName}`));
      return {
        content: [
          {
            type: 'text',
            text: formatMCPResponse(errorResponse),
          },
        ],
        isError: true,
      };
    }

    // Execute handler with error handling
    try {
      const result = await handler(args);
      return {
        content: [
          {
            type: 'text',
            text: formatMCPResponse(result),
          },
        ],
      };
    } catch (error) {
      const errorResponse = formatErrorResponse(error);
      return {
        content: [
          {
            type: 'text',
            text: formatMCPResponse(errorResponse),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start an MCP server with stdio transport
 */
export async function startMCPServer(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
