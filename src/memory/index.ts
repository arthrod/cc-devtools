#!/usr/bin/env node
/**
 * Memory MCP Server
 * Provides persistent memory storage with hybrid keyword/semantic search
 */


import { initializeModel } from '../shared/embeddings.js';
import { createMCPServer, startMCPServer } from '../shared/mcp-server-utils.js';

import { search } from './tools/search.js';
import { storeMemory } from './tools/store.js';

import type { StoreParams, SearchParams } from './types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const MEMORY_STORE_TOOL: Tool = {
  name: 'memory_store',
  description: `Store important information from conversations for future recall. Use this when:
- User shares preferences, requirements, or decisions
- You learn something significant about the project/codebase
- Important context needs to be remembered across sessions
- User explicitly asks you to remember something

The memory will be searchable via keyword and semantic similarity.`,
  inputSchema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'Brief one-line summary (will be shown in search results). Should be clear and specific, e.g. "User prefers functional programming over OOP"'
      },
      details: {
        type: 'string',
        description: 'Detailed information with full context. Include WHY this matters, specific examples, and any relevant constraints. This is what you\'ll read when recalling the memory.'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags for categorization (e.g. ["preferences", "architecture", "tooling"]). Use lowercase, hyphenated tags. Common categories: preferences, decisions, project-setup, coding-style, workflow, architecture, constraints.'
      }
    },
    required: ['summary', 'details']
  }
};

const MEMORY_SEARCH_TOOL: Tool = {
  name: 'memory_search',
  description: `Search stored memories using hybrid keyword + semantic search. Use this when:
- You need to recall user preferences or past decisions
- Looking for project-specific context or constraints
- User asks "what do you remember about X?"
- Starting work on a feature (check for related memories first)
- You're unsure about a preference or requirement

Search combines exact keyword matching (tags, text) with semantic similarity for best results.
Empty query returns most recent memories.`,
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Natural language search query (e.g. "user preferences", "build configuration", "testing approach"). Use specific terms for better results. Empty string "" returns recent memories sorted by date.'
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return. Default: 3 (good for specific queries), increase to 5-10 for broader exploration. Max: 20.',
        default: 3,
        minimum: 1,
        maximum: 20
      }
    },
    required: ['query']
  }
};

async function main(): Promise<void> {
  try {
    await initializeModel();
  } catch (_error) {
    // Model initialization is optional - server continues with degraded functionality
  }

  const server = createMCPServer({
    name: 'cc-devtools-memory-server',
    version: '0.1.0',
    tools: [MEMORY_STORE_TOOL, MEMORY_SEARCH_TOOL],
    handlers: {
      memory_store: async (args) => storeMemory(args as unknown as StoreParams),
      memory_search: async (args) => search(args as unknown as SearchParams),
    },
  });

  await startMCPServer(server);
}

main().catch((_error) => {
  process.exit(1);
});
