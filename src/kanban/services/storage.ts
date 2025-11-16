import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

import * as yaml from 'js-yaml';

import type {
  KanbanData,
  Story,
  Config,
  ParsedId,
  BusinessValue,
  Phase,
  StoryStatus,
  SubtaskStatus
} from '../types.js';

import { createFileError, createInvalidInputError } from '../../shared/errors.js';
import { withLock } from '../../shared/file-lock.js';

/**
 * Get the kanban file path (evaluated at runtime to support testing)
 * The kanban.yaml is stored in the USER's project at cc-devtools/kanban.yaml
 */
function getKanbanFilePath(): string {
  return join(process.cwd(), 'cc-devtools', 'kanban.yaml');
}

/**
 * Read entire kanban.yaml file with lock
 * @returns { config: Object, stories: Array }
 */
export function readKanban(): KanbanData {
  const kanbanFile = getKanbanFilePath();
  try {
    if (!existsSync(kanbanFile)) {
      // Return default structure if file doesn't exist
      return {
        config: getDefaultConfig(),
        stories: []
      };
    }

    const content = readFileSync(kanbanFile, 'utf-8');
    const data = yaml.load(content) as Partial<KanbanData>;

    // Ensure structure
    if (!data.config) {
      data.config = getDefaultConfig();
    }
    if (!data.stories) {
      data.stories = [];
    }

    return data as KanbanData;
  } catch (error) {
    throw createFileError(`Failed to read ${kanbanFile}`, error as Error);
  }
}

/**
 * Write entire kanban.yaml file (internal - assumes caller has lock)
 * @param data - { config: Object, stories: Array }
 */
export function writeKanban(data: KanbanData): void {
  const kanbanFile = getKanbanFilePath();
  try {
    const yamlContent = yaml.dump(data, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    writeFileSync(kanbanFile, yamlContent, 'utf-8');
  } catch (error) {
    throw createFileError(`Failed to write ${kanbanFile}`, error as Error);
  }
}

/**
 * Get configuration
 * @returns Config object
 */
export function readConfig(): Promise<Config> {
  return withLock(getKanbanFilePath(), () => {
    const data = readKanban();
    return data.config;
  });
}

/**
 * Update configuration
 * @param updates - Partial config updates (merged with existing)
 */
export function updateConfig(updates: Partial<Config>): Promise<void> {
  return withLock(getKanbanFilePath(), () => {
    const data = readKanban();
    data.config = { ...data.config, ...updates };
    return writeKanban(data);
  });
}

/**
 * Read all stories
 * @returns Array of story objects
 */
export function readAllStories(): Promise<Story[]> {
  return withLock(getKanbanFilePath(), () => {
    const data = readKanban();
    return data.stories || [];
  });
}

/**
 * Read a single story by ID
 * @param storyId - Story ID (e.g., "MVP-001")
 * @returns Story object or null if not found
 */
export function readStory(storyId: string): Promise<Story | null> {
  return withLock(getKanbanFilePath(), () => {
    const data = readKanban();
    return data.stories.find(s => s.id === storyId) ?? null;
  });
}

/**
 * Save/update a story
 * @param story - Complete story object with id
 */
export function saveStory(story: Story): Promise<void> {
  return withLock(getKanbanFilePath(), () => {
    const data = readKanban();
    const index = data.stories.findIndex(s => s.id === story.id);

    if (index >= 0) {
      // Update existing
      data.stories[index] = story;
    } else {
      // Add new
      data.stories.push(story);
    }

    return writeKanban(data);
  });
}

/**
 * Delete a story and all its subtasks
 * @param storyId - Story ID to delete
 * @returns Deleted story object or null if not found
 */
export function deleteStory(storyId: string): Promise<Story | null> {
  return withLock(getKanbanFilePath(), () => {
    const data = readKanban();
    const index = data.stories.findIndex(s => s.id === storyId);

    if (index >= 0) {
      const deletedStory = data.stories[index];
      data.stories.splice(index, 1);
      writeKanban(data);
      return deletedStory;
    }

    return null;
  });
}

/**
 * Parse an ID to determine type and extract components
 * @param id - Story or subtask ID
 * @returns { type: 'story'|'subtask', storyId: string, subtaskNum?: number }
 */
export function parseId(id: string): ParsedId {
  const subtaskMatch = id.match(/^([A-Z0-9]+-\d+)-(\d+)$/);
  if (subtaskMatch) {
    return {
      type: 'subtask',
      storyId: subtaskMatch[1],
      subtaskNum: parseInt(subtaskMatch[2], 10)
    };
  }

  const storyMatch = id.match(/^[A-Z0-9]+-\d+$/);
  if (storyMatch) {
    return {
      type: 'story',
      storyId: id
    };
  }

  throw {
    message: `Invalid ID format: ${id}. Expected format: PHASE-### for stories (e.g., "MVP-001", "BETA-042") or PHASE-###-# for subtasks (e.g., "MVP-001-1")`,
    code: 'INVALID_INPUT'
  };
}

/**
 * Get default config structure
 * @returns Default configuration
 */
export function getDefaultConfig(): Config {
  return {
    statuses: {
      story: ['todo', 'in_progress', 'in_review', 'done'] as StoryStatus[],
      subtask: ['todo', 'in_progress', 'done'] as SubtaskStatus[]
    },
    business_values: ['XS', 'S', 'M', 'L', 'XL'] as BusinessValue[],
    phases: ['MVP', 'BETA', 'V1', 'POSTRELEASE'],
    default_status: {
      story: 'todo' as StoryStatus,
      subtask: 'todo' as SubtaskStatus
    },
    workflow_rules: {
      max_stories_in_progress: 1,
      subtasks_require_story_in_progress: true,
      all_subtasks_completed_before_review: true
    }
  };
}

/**
 * Generate next story ID for a phase
 * @param phase - Phase name (e.g., MVP, BETA, POSTRELEASE)
 * @returns Next story ID (e.g., "MVP-001")
 */
export async function generateNextStoryId(phase: Phase): Promise<string> {
  return withLock(getKanbanFilePath(), () => {
    const data = readKanban();

    if (!data.config.phases.includes(phase)) {
      throw createInvalidInputError(
        `Invalid phase: "${phase}". Allowed phases: ${data.config.phases.join(', ')}`,
        { allowedPhases: data.config.phases }
      );
    }

    const phaseStories = data.stories.filter(s => s.phase === phase);

    let maxNum = 0;
    for (const story of phaseStories) {
      const match = story.id.match(/^[A-Z0-9]+-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) {
          maxNum = num;
        }
      }
    }

    const nextNum = maxNum + 1;
    return `${phase}-${String(nextNum).padStart(3, '0')}`;
  });
}
