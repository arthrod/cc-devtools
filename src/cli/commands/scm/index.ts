/**
 * Source Code Mapper (SCM) command - Manage code indexing
 */

import { formatErrorWithSuggestions } from '../../core/suggestions.js';

import { statsCommand } from './stats.js';

function showHelp(): void {
  console.log(`
Source Code Mapper (SCM) - Code indexing statistics

Usage:
  npx cc-devtools scm <subcommand> [options]

Subcommands:
  stats                    Show statistics about the indexed codebase
                          (files indexed, symbols found, breakdown by type)

  help                     Show this help message

Examples:
  npx cc-devtools scm stats
`);
}

/**
 * SCM command handler
 */
export async function scmCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  const subcommand = args[0];

  switch (subcommand) {
    case 'stats':
      await statsCommand();
      break;

    default: {
      const availableSubcommands = ['stats', 'help'];
      const errorMessage = formatErrorWithSuggestions(subcommand, availableSubcommands, {
        type: 'subcommand',
        helpCommand: 'npx cc-devtools scm help',
      });
      console.error(`Error: ${errorMessage}`);
      process.exit(1);
    }
  }
}
