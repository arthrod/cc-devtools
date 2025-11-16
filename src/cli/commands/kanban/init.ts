import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import { readKanban, writeKanban, getDefaultConfig } from '../../../kanban/services/storage.js';
import { ErrorCodes, type Story, type KanbanError } from '../../../kanban/types.js';
import { buildSuccess, buildError } from '../../core/response.js';

import type { CLIResponse } from '../../types.js';

const KANBAN_DIR = join(process.cwd(), 'cc-devtools');
const KANBAN_FILE = join(KANBAN_DIR, 'kanban.yaml');

interface InitCommandData {
  valid: boolean;
  issues: Array<{ type: string; message: string }>;
  fixes: string[];
  summary: {
    errors: number;
    warnings: number;
    fixesApplied: number;
  };
}

/**
 * Initialize and validate kanban system
 */
export async function initCommand(
  _positional: string[],
  _options: Record<string, string | boolean>
): Promise<CLIResponse> {
  return Promise.resolve().then(() => {
    try {
    const issues: Array<{ type: string; message: string }> = [];
    const fixes: string[] = [];

    // Check if kanban directory exists
    if (!existsSync(KANBAN_DIR)) {
      issues.push({ type: 'ERROR', message: 'Kanban directory does not exist' });
      mkdirSync(KANBAN_DIR, { recursive: true });
      fixes.push('Created cc-devtools directory');
    }

    // Check if kanban.yaml exists
    if (!existsSync(KANBAN_FILE)) {
      issues.push({ type: 'ERROR', message: 'kanban.yaml does not exist' });

      const defaultConfig = getDefaultConfig();
      const defaultData = {
        config: defaultConfig,
        stories: []
      };

      writeKanban(defaultData);
      fixes.push('Created default kanban.yaml with the following configuration:');
      fixes.push(`  • Phases: ${defaultConfig.phases.join(', ')}`);
      fixes.push(`  • Story statuses: ${defaultConfig.statuses.story.join(', ')}`);
      fixes.push(`  • Subtask statuses: ${defaultConfig.statuses.subtask.join(', ')}`);
      fixes.push(`  • Business values: ${defaultConfig.business_values.join(', ')}`);
      fixes.push(`  • Max stories in progress: ${defaultConfig.workflow_rules.max_stories_in_progress}`);
      fixes.push('');
      fixes.push('You can customize these settings by editing cc-devtools/kanban.yaml');
    }

    // Validate kanban.yaml structure
    let config;
    let stories: Story[] = [];

    try {
      const data = readKanban();
      config = data.config;
      stories = data.stories || [];

      const requiredFields = [
        'statuses',
        'business_values',
        'phases',
        'default_status',
        'workflow_rules'
      ];

      for (const field of requiredFields) {
        if (!config[field as keyof typeof config]) {
          issues.push({ type: 'ERROR', message: `config missing required field: ${field}` });
        }
      }

      if (config.statuses) {
        if (!config.statuses.story || !Array.isArray(config.statuses.story)) {
          issues.push({ type: 'ERROR', message: 'config.statuses.story must be an array' });
        }
        if (!config.statuses.subtask || !Array.isArray(config.statuses.subtask)) {
          issues.push({ type: 'ERROR', message: 'config.statuses.subtask must be an array' });
        }
      }
    } catch (error) {
      const err = error as Error;
      issues.push({ type: 'ERROR', message: `Failed to validate kanban.yaml: ${err.message}` });
      stories = [];
      config = getDefaultConfig();
    }

    // Validate story structures
    for (const story of stories) {
      if (!story.id) {
        issues.push({ type: 'ERROR', message: `Story missing id field` });
        continue;
      }

      // Validate required fields
      const requiredStoryFields = ['id', 'title', 'status', 'phase'];
      for (const field of requiredStoryFields) {
        if (!story[field as keyof typeof story]) {
          issues.push({ type: 'WARNING', message: `Story ${story.id} missing required field: ${field}` });
        }
      }

      // Validate status
      if (config?.statuses?.story) {
        if (!config.statuses.story.includes(story.status)) {
          issues.push({ type: 'ERROR', message: `Story ${story.id} has invalid status: ${story.status}` });
        }
      }

      // Validate phase
      if (config?.phases) {
        if (!config.phases.includes(story.phase)) {
          issues.push({ type: 'WARNING', message: `Story ${story.id} has invalid phase: ${story.phase}` });
        }
      }

      // Validate subtasks
      if (story.subtasks) {
        for (const subtask of story.subtasks) {
          if (!subtask.id) {
            issues.push({ type: 'ERROR', message: `Subtask in story ${story.id} missing id field` });
            continue;
          }

          if (!subtask.id.startsWith(story.id + '-')) {
            issues.push({ type: 'ERROR', message: `Subtask ${subtask.id} has invalid ID format (should start with ${story.id}-)` });
          }

          if (config?.statuses?.subtask) {
            if (!config.statuses.subtask.includes(subtask.status)) {
              issues.push({ type: 'ERROR', message: `Subtask ${subtask.id} has invalid status: ${subtask.status}` });
            }
          }
        }
      }
    }

    // Check workflow violations
    const inProgress = stories.filter(s => s.status === 'in_progress');
    if (config?.workflow_rules?.max_stories_in_progress) {
      if (inProgress.length > config.workflow_rules.max_stories_in_progress) {
        issues.push({
          type: 'WARNING',
          message: `Workflow violation: ${inProgress.length} stories in progress (max: ${config.workflow_rules.max_stories_in_progress})`
        });
      }
    }

    // Output results
    const hasErrors = issues.some(i => i.type === 'ERROR');

    const result: InitCommandData = {
      valid: !hasErrors,
      issues,
      fixes,
      summary: {
        errors: issues.filter(i => i.type === 'ERROR').length,
        warnings: issues.filter(i => i.type === 'WARNING').length,
        fixesApplied: fixes.length
      }
    };

    return buildSuccess('init', result);

    } catch (error) {
      const err = error as KanbanError;
      return buildError('init', err.message, err.code ?? ErrorCodes.UNKNOWN_ERROR);
    }
  });
}
