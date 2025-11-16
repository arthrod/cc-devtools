/**
 * State reading functions for workflow
 * Reads git state, kanban state, and derives workflow state variables
 */

import { execSync } from 'child_process';

import type { WorkflowState, StateVariables, ParsedStoryId, WorkflowLogger } from '../types/workflow.js';

import { readAllStories, readConfig } from '../../kanban/services/storage.js';

import type { Story, Subtask, Phase } from '../../kanban/types.js';

/**
 * Run shell command and return output
 */
function runCommand(command: string, logger?: WorkflowLogger): string {
  logger?.debug(`Running command: ${command}`);
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    logger?.debug(`Command succeeded: ${command}`, { output });
    return output;
  } catch (error) {
    logger?.error(`Command failed: ${command}`, {
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Extract story ID from branch name
 * "feature/MVP-001-project-setup" → "MVP-001"
 */
function extractStoryIdFromBranch(branchName: string, logger?: WorkflowLogger): string | null {
  logger?.debug(`Extracting story ID from branch: ${branchName}`);

  const match = branchName.match(/^feature\/([A-Z]+-\d+)(?:-|$)/);

  if (match) {
    const storyId = match[1];
    logger?.debug(`Extracted story ID: ${storyId}`);
    return storyId;
  }

  logger?.debug('Could not extract story ID from branch name');
  return null;
}


/**
 * Check if branch is merged into current branch
 */
function isBranchMerged(branchName: string, logger?: WorkflowLogger): boolean {
  try {
    const mergedBranches = runCommand('git branch --merged', logger)
      .split('\n')
      .map((b) => b.trim().replace('* ', ''));
    return mergedBranches.includes(branchName);
  } catch (_error) {
    logger?.error(`Failed to check if branch ${branchName} is merged`);
    return false;
  }
}

/**
 * Find feature branch for a story
 * Returns branch name or null
 */
function findFeatureBranchForStory(storyId: string, logger?: WorkflowLogger): string | null {
  try {
    const branches = runCommand('git branch', logger)
      .split('\n')
      .map((b) => b.trim().replace('* ', ''));

    const featureBranchPattern = `feature/${storyId}-`;
    const branch = branches.find((b) => b.startsWith(featureBranchPattern));

    logger?.debug(`Feature branch for ${storyId}:`, { branch: branch ?? 'not found' });
    return branch ?? null;
  } catch (_error) {
    logger?.error(`Failed to find feature branch for ${storyId}`);
    return null;
  }
}

/**
 * Read git state
 */
export function getGitState(logger?: WorkflowLogger): WorkflowState | null {
  logger?.info('Reading git state');

  try {
    try {
      runCommand('git rev-parse --git-dir', logger);
    } catch (_error) {
      logger?.error('Not in a git repository');
      return null;
    }

    const currentBranch = runCommand('git rev-parse --abbrev-ref HEAD', logger);
    logger?.info(`Current branch: ${currentBranch}`);

    const statusOutput = runCommand('git status --porcelain', logger);
    const uncommittedChanges = statusOutput.length > 0;

    let lastCommitIsFinalized = false;
    try {
      const lastCommitMsg = runCommand('git log -1 --pretty=%B', logger);
      lastCommitIsFinalized = lastCommitMsg.toLowerCase().includes('finalized');
      logger?.debug(`Last commit finalized: ${lastCommitIsFinalized}`, { lastCommitMsg });
    } catch (_error) {
      logger?.debug('Could not read last commit message (likely no commits yet)');
    }

    const modifiedFiles: string[] = [];
    const untrackedFiles: string[] = [];

    if (uncommittedChanges) {
      statusOutput.split('\n').forEach((line) => {
        if (!line) return;
        const status = line.substring(0, 2);
        const file = line.substring(3);

        if (status.includes('?')) {
          untrackedFiles.push(file);
        } else {
          modifiedFiles.push(file);
        }
      });
    }

    const gitState: WorkflowState = {
      git_branch: currentBranch,
      git_clean: !uncommittedChanges,
      git_last_commit_is_finalized: lastCommitIsFinalized,
      modified_files: modifiedFiles,
      untracked_files: untrackedFiles,
    };

    logger?.info('Git state read successfully', { gitState });
    return gitState;
  } catch (error) {
    logger?.error('Failed to read git state', { error: (error as Error).message });
    return null;
  }
}

/**
 * Sort stories by phase priority (config order) then by story number
 */
function sortStoriesByPhase(stories: Story[], phases: Phase[]): Story[] {
  const parseStoryId = (id: string): ParsedStoryId => {
    const match = id.match(/^([A-Z]+)-(\d+)$/);
    if (!match) return { phase: '', num: 999999 };
    return { phase: match[1], num: parseInt(match[2], 10) };
  };

  return [...stories].sort((a, b) => {
    const aId = parseStoryId(a.id);
    const bId = parseStoryId(b.id);

    if (aId.phase !== bId.phase) {
      const aIndex = phases.indexOf(aId.phase);
      const bIndex = phases.indexOf(bId.phase);

      const aPriority = aIndex === -1 ? 999999 : aIndex;
      const bPriority = bIndex === -1 ? 999999 : bIndex;

      return aPriority - bPriority;
    }

    return aId.num - bId.num;
  });
}

/**
 * Derive all state variables from git, kanban, and config state
 */
export async function deriveStateVariables(
  gitState: WorkflowState,
  logger?: WorkflowLogger
): Promise<StateVariables> {
  logger?.info('Deriving state variables');

  const stories = await readAllStories();
  const kanbanConfig = await readConfig();
  const phases = kanbanConfig.phases;

  const stories_in_progress = stories.filter((s) => s.status === 'in_progress');
  const stories_in_review = stories.filter((s) => s.status === 'in_review');
  const stories_done = stories.filter((s) => s.status === 'done');
  const stories_todo = sortStoriesByPhase(
    stories.filter((s) => s.status === 'todo'),
    phases
  );
  const stories_blocked: Story[] = [];

  const current_story = stories_in_progress[0] ?? stories_in_review[0] ?? null;
  const current_story_id = current_story?.id ?? null;
  const current_story_status = current_story?.status ?? null;
  const current_story_subtasks = current_story?.subtasks ?? null;

  let subtasks_in_progress = 0;
  let subtasks_todo = 0;
  let subtasks_done = 0;
  let current_subtask: Subtask | null = null;
  let current_subtask_id: string | null = null;
  let next_subtask: Subtask | null = null;
  let next_subtask_id: string | null = null;
  let next_subtask_title: string | null = null;

  if (current_story_subtasks && Array.isArray(current_story_subtasks)) {
    subtasks_in_progress = current_story_subtasks.filter((st) => st.status === 'in_progress').length;
    subtasks_todo = current_story_subtasks.filter((st) => st.status === 'todo').length;
    subtasks_done = current_story_subtasks.filter((st) => st.status === 'done').length;

    current_subtask = current_story_subtasks.find((st) => st.status === 'in_progress') ?? null;
    current_subtask_id = current_subtask?.id ?? null;

    next_subtask = current_story_subtasks.find((st) => st.status === 'todo') ?? null;
    next_subtask_id = next_subtask?.id ?? null;
    next_subtask_title = next_subtask?.title ?? null;
  }

  const next_story = stories_todo[0] ?? null;
  const next_story_id = next_story?.id ?? null;
  const next_story_title = next_story?.title ?? null;

  const current_branch_story_id = extractStoryIdFromBranch(gitState.git_branch, logger);

  const on_feature_branch_for_done_story = Boolean(
    gitState.git_branch.startsWith('feature/') &&
      current_branch_story_id &&
      stories_done.some((s) => s.id === current_branch_story_id)
  );

  const first_done_story = stories_done[0] ?? null;
  const first_done_story_id = first_done_story?.id ?? null;

  let done_story_feature_branch_name: string | null = null;
  let done_story_feature_branch_exists = false;
  let done_story_feature_branch_merged = false;

  if (first_done_story_id) {
    done_story_feature_branch_name = findFeatureBranchForStory(first_done_story_id, logger);
    done_story_feature_branch_exists = Boolean(done_story_feature_branch_name);
    if (done_story_feature_branch_name) {
      done_story_feature_branch_merged = isBranchMerged(done_story_feature_branch_name, logger);
    }
  }

  let feature_branch_exists_for_current_story = false;
  if (current_story_id && current_story_status === 'in_progress') {
    const currentFeatureBranch = findFeatureBranchForStory(current_story_id, logger);
    feature_branch_exists_for_current_story = Boolean(currentFeatureBranch);
  }

  const stateVars: StateVariables = {
    ...gitState,
    total_stories: stories.length,
    stories_in_progress,
    stories_in_review,
    stories_done,
    stories_todo,
    stories_blocked,
    current_story,
    current_story_id,
    current_story_status,
    current_story_subtasks,
    subtasks_in_progress,
    subtasks_todo,
    subtasks_done,
    current_subtask,
    current_subtask_id,
    next_subtask,
    next_subtask_id,
    next_subtask_title,
    next_story,
    next_story_id,
    next_story_title,
    current_branch_story_id,
    on_feature_branch_for_done_story,
    first_done_story_id,
    done_story_feature_branch_exists,
    done_story_feature_branch_name,
    done_story_feature_branch_merged,
    feature_branch_exists_for_current_story,
  };

  logger?.info('State variables derived');
  return stateVars;
}
