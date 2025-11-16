#!/usr/bin/env node
/**
 * Planner MCP Server
 * Provides persistent planning and progress tracking for multi-session development
 */


import { createMCPServer, startMCPServer } from '../shared/mcp-server-utils.js';

import { initializeModel } from './core/embeddings.js';
import { search } from './tools/search.js';
import { storePlan } from './tools/store.js';
import { updatePlan } from './tools/update.js';

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const PLAN_STORE_TOOL: Tool = {
  name: 'plan_store',
  description: `Store a new implementation plan for tracking multi-session development work. Use this when:
- Starting a large feature or project that spans multiple sessions
- You need to plan and track complex implementation work
- User asks you to create a plan for upcoming work

Plans persist across sessions and can be searched/updated as work progresses.
Use TodoWrite for session-level subtasks, use plans for multi-session phases.`,
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Semantic kebab-case identifier (e.g. "memory-system-implementation", "api-redesign-v2"). Must be unique.'
      },
      summary: {
        type: 'string',
        description: 'One-line summary of the plan (e.g. "Build MCP server for persistent memory")'
      },
      goal: {
        type: 'string',
        description: 'Primary goal and purpose of this plan. Explain WHY this work matters.'
      },
      decisions: {
        type: 'string',
        description: 'Key architectural and design decisions (markdown format). Can be empty string if no decisions yet.'
      },
      implementation_plan: {
        type: 'string',
        description: 'Detailed implementation plan with phases and steps (markdown format). Can be empty string initially.'
      },
      tasks: {
        type: 'array',
        description: 'High-level multi-session tasks/phases. Each task should represent substantial work (hours/days). Can be empty array.',
        items: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: 'Task summary (required, e.g. "Phase 2: Core Storage Module")'
            },
            details: {
              type: 'string',
              description: 'Optional task details'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
              description: 'Task status (defaults to "pending")'
            }
          },
          required: ['summary']
        }
      }
    },
    required: ['id', 'summary', 'goal', 'decisions', 'implementation_plan', 'tasks']
  }
};

const PLAN_SEARCH_TOOL: Tool = {
  name: 'plan_search',
  description: `Search for plans using hybrid keyword + semantic search. Use this when:
- Resuming work on a previous project/feature
- Looking for existing plans related to current work
- User asks "what plans exist" or "find the plan for X"
- Checking for paused work sessions (status="on_hold")

By default returns summary-only results (lightweight). Set summary_only=false to get full plan details.
Empty query returns most recent plans.`,
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (e.g. "memory system", "api design"). Use specific terms. Empty string "" returns recent plans.'
      },
      id: {
        type: 'string',
        description: 'Exact plan ID to retrieve (bypasses search). Use this when you know the exact plan ID.'
      },
      status: {
        type: 'string',
        enum: ['planning', 'in_progress', 'completed', 'on_hold', 'abandoned'],
        description: 'Filter by plan status. Use "on_hold" to find paused work sessions.'
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return (default: 1). Use 1 for focused retrieval, 3-5 for exploration.',
        default: 1,
        minimum: 1,
        maximum: 20
      },
      summary_only: {
        type: 'boolean',
        description: 'Return summary-only results (default: true). Set to false to get full plan with all fields. Summary mode is lightweight for browsing.',
        default: true
      },
      include_all_statuses: {
        type: 'boolean',
        description: 'Include completed and abandoned plans (default: false). By default only searches active plans (planning, in_progress, on_hold).',
        default: false
      }
    }
  }
};

const PLAN_UPDATE_TOOL: Tool = {
  name: 'plan_update',
  description: `Update an existing plan: change task statuses, add new tasks, append progress notes, or update plan status.

Use this when:
- Marking a task as completed or in_progress
- Adding implementation notes about progress or discoveries
- Adding new tasks as work evolves
- Changing plan status (e.g. planning → in_progress → completed → on_hold)

All parameters are optional except id. Can perform multiple updates atomically.`,
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Plan ID to update (required)'
      },
      task_updates: {
        type: 'array',
        description: 'Update status of existing tasks by array index (0-based)',
        items: {
          type: 'object',
          properties: {
            index: {
              type: 'number',
              description: 'Task array index (0-based)'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
              description: 'New task status'
            }
          },
          required: ['index', 'status']
        }
      },
      new_tasks: {
        type: 'array',
        description: 'Add new tasks to the plan',
        items: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: 'Task summary (required)'
            },
            details: {
              type: 'string',
              description: 'Optional task details'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed'],
              description: 'Task status (defaults to "pending")'
            }
          },
          required: ['summary']
        }
      },
      add_note: {
        type: 'string',
        description: 'Append a timestamped progress note (server adds timestamp automatically). Use this to record discoveries, blockers, or progress updates.'
      },
      plan_status: {
        type: 'string',
        enum: ['planning', 'in_progress', 'completed', 'on_hold', 'abandoned'],
        description: 'Update plan-level status. Use on_hold for paused work sessions.'
      }
    },
    required: ['id']
  }
};

async function main(): Promise<void> {
  try {
    await initializeModel();
  } catch (_error) {
    // Model initialization is optional - server continues with degraded functionality
  }

  const server = createMCPServer({
    name: 'cc-devtools-planner-server',
    version: '0.1.0',
    tools: [PLAN_STORE_TOOL, PLAN_SEARCH_TOOL, PLAN_UPDATE_TOOL],
    handlers: {
      plan_store: async (args) => storePlan(args as unknown as Parameters<typeof storePlan>[0]),
      plan_search: async (args) => search(args as unknown as Parameters<typeof search>[0]),
      plan_update: async (args) => updatePlan(args as unknown as Parameters<typeof updatePlan>[0]),
    },
  });

  await startMCPServer(server);
}

main().catch((_error) => {
  process.exit(1);
});
