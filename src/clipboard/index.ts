#!/usr/bin/env node
/**
 * Clipboard MCP Server
 * Provides clipboard write capability for copying content from LLM responses
 */

import { createMCPServer, startMCPServer } from '../shared/mcp-server-utils.js';

import { writeToClipboard } from './tools/write.js';

import type { ClipboardWriteParams } from './types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const CLIPBOARD_WRITE_TOOL: Tool = {
  name: 'clipboard_write',
  description: `Copy content to the system clipboard ONLY when the user explicitly requests it.

IMPORTANT: Only use this tool when the user explicitly asks you to copy something to their clipboard using phrases like:
- "copy this to clipboard"
- "put this on my clipboard"
- "copy that to my clipboard"
- "clipboard this"
- "save this to clipboard"

DO NOT use this tool proactively or automatically. The user must explicitly request clipboard copying.

The content will be copied as plain text to the system clipboard, ready to paste anywhere.`,
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The text content to copy to clipboard. Can include markdown formatting, code blocks, or any plain text content.'
      },
      format: {
        type: 'string',
        enum: ['text', 'html'],
        description: 'Output format (currently only "text" is supported). Default: "text"',
        default: 'text'
      }
    },
    required: ['content']
  }
};

async function main(): Promise<void> {
  const server = createMCPServer({
    name: 'cc-devtools-clipboard',
    version: '1.0.0',
    tools: [CLIPBOARD_WRITE_TOOL],
    handlers: {
      clipboard_write: async (args) => writeToClipboard(args as unknown as ClipboardWriteParams),
    },
  });

  await startMCPServer(server);
}

main().catch(() => {
  process.exit(1);
});
