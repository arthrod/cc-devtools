#!/usr/bin/env node


import { createMCPServer, startMCPServer } from '../shared/mcp-server-utils.js';

import { handleGetWorkItem } from "./tools/get-work-item.js";
import { handleUpdateWorkItem } from "./tools/update-work-item.js";

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const KANBAN_GET_WORK_ITEM_TOOL: Tool = {
  name: "kanban_get_work_item",
  description: `Get intelligent recommendation for next work item. Call this when user asks "what should I work on next?"

Returns current work in progress (if any) or recommends next story to start (prioritized by story ID).
Includes next steps, suggestions, and review feedback if work needs rework.

By default returns condensed format (omits verbose fields like details, planning_notes, implementation_notes, relevant_documentation).`,
  inputSchema: {
    type: "object",
    properties: {
      include_details: {
        type: "boolean",
        description: "Include verbose fields (details, planning_notes, implementation_notes, relevant_documentation). Default: false",
      },
    },
    required: [],
  },
};

const KANBAN_UPDATE_WORK_ITEM_TOOL: Tool = {
  name: "kanban_update_work_item",
  description: `Update work item status. Validates transitions and provides suggestions for next steps.

Always include implementation_notes when marking work as done to document what was accomplished.`,
  inputSchema: {
    type: "object",
    properties: {
      item_id: {
        type: "string",
        description: "Story or subtask ID (e.g., 'MVP-003' or 'MVP-003-2')",
      },
      status: {
        type: "string",
        description: "New status (story: todo|in_progress|in_review|done, subtask: todo|in_progress|done)",
      },
      implementation_notes: {
        type: "string",
        description: "Notes about what was done. Strongly recommended when marking done.",
      },
    },
    required: ["item_id", "status"],
  },
};

async function main(): Promise<void> {
  const server = createMCPServer({
    name: "cc-devtools-kanban",
    version: "1.0.0",
    tools: [KANBAN_GET_WORK_ITEM_TOOL, KANBAN_UPDATE_WORK_ITEM_TOOL],
    handlers: {
      kanban_get_work_item: async (args) => {
        const includeDetails = args && typeof args === 'object' && 'include_details' in args
          ? Boolean(args.include_details)
          : false;
        return handleGetWorkItem(includeDetails);
      },
      kanban_update_work_item: async (args) => {
        if (!args || typeof args !== 'object') {
          throw new Error('Invalid arguments');
        }
        const typedArgs = args;
        if (typeof typedArgs.item_id !== 'string' || typeof typedArgs.status !== 'string') {
          throw new Error('Invalid arguments: item_id and status are required');
        }
        return handleUpdateWorkItem({
          item_id: typedArgs.item_id,
          status: typedArgs.status,
          implementation_notes: typeof typedArgs.implementation_notes === 'string' ? typedArgs.implementation_notes : undefined,
        });
      },
    },
  });

  await startMCPServer(server);
}

main().catch(() => {
  process.exit(1);
});
