/**
 * Kanban CLI command handler
 * Delegates to kanban CLI commands
 */

import { parseArgs, getOption } from '../../core/parser.js';
import { outputAndExit, buildError } from '../../core/response.js';
import { formatErrorWithSuggestions } from '../../core/suggestions.js';

import { addReviewCommand } from './add-review.js';
import { appendStoryFieldCommand } from './append-story-field.js';
import { appendSubtaskFieldCommand } from './append-subtask-field.js';
import { configCommand } from './config.js';
import { createStoriesCommand } from './create-stories.js';
import { createSubtasksCommand } from './create-subtasks.js';
import { deleteStoryCommand } from './delete-story.js';
import { deleteSubtaskCommand } from './delete-subtask.js';
import { getReviewCommand } from './get-review.js';
import { getRoundReviewersCommand } from './get-round-reviewers.js';
import { getCommand } from './get.js';
import { initCommand } from './init.js';
import { listCommand } from './list.js';
import { moveCommand } from './move.js';
import { nextCommand } from './next.js';
import { searchCommand } from './search.js';
import { statsCommand } from './stats.js';
import { updateStoryCommand } from './update-story.js';
import { updateSubtaskCommand } from './update-subtask.js';
import { validateCommand } from './validate.js';

import type { ErrorWithCode } from '../../../shared/types/common.js';

const COMMANDS: Record<string, (pos: string[], opt: Record<string, string | boolean>) => Promise<unknown>> = {
  'list': listCommand,
  'get': getCommand,
  'move': moveCommand,
  'next': nextCommand,
  'search': searchCommand,
  'config': configCommand,
  'create-stories': createStoriesCommand,
  'create-subtasks': createSubtasksCommand,
  'update-story': updateStoryCommand,
  'update-subtask': updateSubtaskCommand,
  'append-story-field': appendStoryFieldCommand,
  'append-subtask-field': appendSubtaskFieldCommand,
  'delete-story': deleteStoryCommand,
  'delete-subtask': deleteSubtaskCommand,
  'validate': validateCommand,
  'stats': statsCommand,
  'init': initCommand,
  'add-review': addReviewCommand,
  'get-review': getReviewCommand,
  'get-round-reviewers': getRoundReviewersCommand
};

const HELP_TEXT = `
Unified Kanban CLI - File operations for kanban system

Usage:
  npx cc-devtools kanban <command> [arguments] [options]

Commands:
  list [options]                  List and filter stories
    --filter=<status>             Filter by status (todo, in_progress, in_review, blocked, done, current, all)
    --phase=<phase>               Filter by phase (MVP, BETA, POSTRELEASE)
    --label=<label>               Filter by label
    --value=<value>               Filter by business value (XS, S, M, L, XL)

  get <id> [options]              Get story or subtask details (condensed by default)
    --full                        Show all fields including verbose ones
    --field=<name>                Show only a specific verbose field (details, planning_notes, review_feedback, implementation_notes, relevant_documentation)

  move <id> <status> [options]    Move story/subtask to new status
    --note="..."                  Add implementation note

  config                          Get kanban configuration (phases, statuses, workflow rules)

  update-story <id> [options]     Update story fields (excluding status)
    --title="..."                 Update story title
    --description="..."           Update description
    --details="..."               Update extended details
    --phase=<phase>               Update phase
    --business_value=<value>      Update business value (XS, S, M, L, XL)
    --effort=<hours>              Update effort estimation in hours
    --labels=<label1,label2>      Update labels (comma-separated)
    --dependent_upon=<id1,id2>    Update dependencies (comma-separated)
    --planning_notes="..."        Update planning notes
    --acceptance_criteria="..."   Update acceptance criteria (comma-separated)
    --relevant_documentation="..." Update documentation links (comma-separated)
    --implementation_notes="..."  Update implementation notes

  update-subtask <id> [options]   Update subtask fields (excluding status)
    --title="..."                 Update subtask title
    --description="..."           Update subtask description
    --details="..."               Update extended details
    --effort=<hours>              Update effort estimation in hours
    --dependent_upon=<id1,id2>    Update dependencies (comma-separated)
    --planning_notes="..."        Update planning notes
    --acceptance_criteria="..."   Update acceptance criteria (comma-separated)
    --relevant_documentation="..." Update documentation links (comma-separated)
    --implementation_notes="..."  Update implementation notes

  append-story-field <id> <field> <content>
                                  Append content to story field (planning_notes, implementation_notes)

  append-subtask-field <id> <field> <content>
                                  Append content to subtask field (planning_notes, implementation_notes)

  validate <id> <status>          Validate move without executing

  next                            Find next work item (current or recommended)

  search <query> [options]        Search stories and subtasks using semantic search
    --limit=<number>              Maximum number of results (default: 5)
    --similarity-threshold=<num>  Minimum similarity score 0-1 (default: 0.3)
    --scope=<scope>               What to search: stories, subtasks, both (default: stories)
    --status=<status>             Filter by status (optional)
    --story=<id>                  Filter subtasks to specific story (optional, only for subtasks scope)

  stats [options]                 Get kanban statistics
    --health-check                Include health check and issues

  create-stories '<json>'         Create one or more stories from JSON
  create-subtasks <id> '<json>'   Create one or more subtasks for a story
  delete-story <id>               Delete a story and all its subtasks
  delete-subtask <id>             Delete a specific subtask from a story
  init                            Initialize/validate kanban system

  add-review [options]            Add a review for a story
    --story=<storyId>             Story ID
    --round=<number>              Review round number
    --author=<string>             Reviewer name
    --content=<content>           Review content

  get-review [options]            Get a specific review
    --story=<storyId>             Story ID
    --round=<number>              Review round number
    --author=<string>             Reviewer name

  get-round-reviewers [options]   Get reviewers grouped by round for a story
    --story=<storyId>             Story ID

Global Options:
  --pretty                        Pretty-print JSON output

Examples:
  npx cc-devtools kanban list --filter=todo
  npx cc-devtools kanban get MVP-001
  npx cc-devtools kanban get MVP-001 --full
  npx cc-devtools kanban get MVP-001 --field=review_feedback
  npx cc-devtools kanban move MVP-001 in_progress
  npx cc-devtools kanban config
  npx cc-devtools kanban search "authentication error handling" --limit=3
  npx cc-devtools kanban search "add tests" --scope=subtasks --story=MVP-001
  npx cc-devtools kanban search "cache layer" --status=todo --scope=stories
  npx cc-devtools kanban update-story MVP-001 --title="New title" --effort=8 --details="Extended info"
  npx cc-devtools kanban update-subtask MVP-001-1 --description="Updated desc" --acceptance_criteria="Test 1,Test 2"
  npx cc-devtools kanban next
  npx cc-devtools kanban stats --health-check
`;

/**
 * Kanban command handler
 */
export async function kanbanCommand(args: string[]): Promise<void> {
  try {
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
      console.log(HELP_TEXT);
      process.exit(0);
    }

    const { command, positional, options } = parseArgs(args);

    if (!command) {
      console.log(HELP_TEXT);
      process.exit(1);
    }

    const handler = COMMANDS[command];

    if (!handler) {
      const errorMessage = formatErrorWithSuggestions(command, Object.keys(COMMANDS), {
        type: 'subcommand',
        helpCommand: 'npx cc-devtools kanban --help',
      });
      const response = buildError(
        command,
        errorMessage,
        'INVALID_INPUT'
      );
      outputAndExit(response, false);
      return;
    }

    const result = await handler(positional, options);
    const pretty = getOption(options, 'pretty', false);
    outputAndExit(result as Parameters<typeof outputAndExit>[0], Boolean(pretty));

  } catch (error) {
    const err = error as ErrorWithCode;
    const response = buildError(
      'kanban',
      err.message ?? 'Unexpected error',
      err.code ?? 'UNKNOWN_ERROR'
    );
    outputAndExit(response, false);
  }
}
