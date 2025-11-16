/**
 * Workflow CLI command handler
 * Routes to workflow subcommands (check, review)
 */

import { parseArgs } from '../../core/parser.js';
import { outputAndExit, buildError } from '../../core/response.js';
import { formatErrorWithSuggestions } from '../../core/suggestions.js';

import { checkCommand } from './check.js';
import { reviewCommand } from './review.js';

import type { ErrorWithCode } from '../../../shared/types/common.js';

const COMMANDS: Record<
  string,
  (pos: string[], opt: Record<string, string | boolean>) => Promise<unknown>
> = {
  check: checkCommand,
  review: reviewCommand,
};

const HELP_TEXT = `
Workflow CLI - Automated workflow state machine and code review

Usage:
  npx cc-devtools workflow <command> [arguments] [options]

Commands:
  check [options]                 Analyze current workflow state
    --config=<path>               Use custom config file (default: cc-devtools/workflow/config.yaml)

  review [reviewers...] [options] Execute automated code review
    [reviewers...]                Specific reviewer names to run (e.g., "claude codex")
                                  If not specified, runs all enabled reviewers
    --cleanup                     Clean up review metadata files

Global Options:
  --pretty                        Pretty-print JSON output

Examples:
  npx cc-devtools workflow check
  npx cc-devtools workflow check --config=custom-config.yaml
  npx cc-devtools workflow review
  npx cc-devtools workflow review claude
  npx cc-devtools workflow review claude codex
  npx cc-devtools workflow review --cleanup

Workflow System:
  The workflow feature analyzes git and kanban state to determine what action
  should be taken next. It uses a decision tree to guide solo developer workflow
  from story creation through implementation, review, and completion.

  The review command orchestrates multiple AI reviewers in parallel, cross-validates
  their findings, and stores results in kanban for tracking.

Configuration:
  Workflow config:  cc-devtools/workflow/config.yaml
  Reviewer config:  cc-devtools/workflow/reviewers.yaml
  Decision tree:    cc-devtools/workflow/decision-tree.yaml (optional override)

For more information, see: docs/workflow/README.md
`;

/**
 * Workflow command handler
 */
export async function workflowCommand(args: string[]): Promise<void> {
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
        helpCommand: 'npx cc-devtools workflow --help',
      });
      const response = buildError(command, errorMessage, 'INVALID_INPUT');
      outputAndExit(response, false);
      return;
    }

    const result = await handler(positional, options);
    const pretty = options.pretty === true;
    outputAndExit(result as Parameters<typeof outputAndExit>[0], pretty);
  } catch (error) {
    const err = error as ErrorWithCode;
    const response = buildError(
      'workflow',
      err.message ?? 'Unexpected error',
      err.code ?? 'UNKNOWN_ERROR'
    );
    outputAndExit(response, false);
  }
}
