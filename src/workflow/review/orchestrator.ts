/**
 * Review orchestration - coordinates multiple reviewers
 */

import { execSync } from 'child_process';
import { writeFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

import type { ReviewMetadata, ReviewOrchestrationResult, ReviewerConfig, KanbanRoundsData } from '../types/review.js';

import { readAllStories } from '../../kanban/services/storage.js';

import { loadReviewConfig, getEnabledReviewers } from './config.js';
import { postProcessReview } from './post-processor.js';
import { generateReviewPrompt } from './prompt-generator.js';
import { runReviewer } from './reviewer-runner.js';

/**
 * Generate review metadata (story ID, round number)
 */
export async function generateReviewMetadata(): Promise<ReviewMetadata> {
  const stories = await readAllStories();
  const inReviewStories = stories.filter((s) => s.status === 'in_review');

  if (inReviewStories.length === 0) {
    throw new Error('No story currently in review status');
  }

  const story = inReviewStories[0];

  const roundsOutput = execSync(
    `npx cc-devtools kanban get-round-reviewers --story=${story.id}`,
    { encoding: 'utf-8' }
  );

  const roundsData = JSON.parse(roundsOutput) as KanbanRoundsData;
  const roundNumber =
    roundsData.data?.rounds && roundsData.data.rounds.length > 0
      ? Math.max(...roundsData.data.rounds.map((r) => r.round)) + 1
      : 1;

  return {
    story_id: story.id,
    round_number: roundNumber,
  };
}

/**
 * Generate and save review prompt
 */
export async function generateAndSaveReviewPrompt(
  metadata: ReviewMetadata
): Promise<{ promptPath: string; metadataPath: string }> {
  const stories = await readAllStories();
  const story = stories.find((s) => s.id === metadata.story_id);

  if (!story) {
    throw new Error(`Story ${metadata.story_id} not found`);
  }

  const gitBranch = execSync('git branch --show-current', {
    encoding: 'utf-8',
  }).trim();

  const prompt = generateReviewPrompt({
    storyId: story.id,
    storyTitle: story.title,
    roundNumber: metadata.round_number,
    gitBranch,
  });

  const tmpDir = join(process.cwd(), '.tmp');
  const promptPath = join(tmpDir, 'review-prompt.txt');
  const metadataPath = join(tmpDir, 'review-metadata.json');

  // Ensure .tmp directory exists
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  writeFileSync(promptPath, prompt, 'utf-8');
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  return { promptPath, metadataPath };
}

/**
 * Execute automated review workflow
 */
export async function executeAutomatedReview(
  reviewerNames?: string[],
  configPath?: string,
  onProgress?: (message: string) => void
): Promise<ReviewOrchestrationResult> {
  const config = loadReviewConfig(configPath);

  let reviewersToRun: ReviewerConfig[];
  if (reviewerNames && reviewerNames.length > 0) {
    reviewersToRun = config.reviewers.filter((r) =>
      reviewerNames.includes(r.name.toLowerCase())
    );
    if (reviewersToRun.length === 0) {
      throw new Error(`No matching reviewers found for: ${reviewerNames.join(', ')}`);
    }
  } else {
    reviewersToRun = getEnabledReviewers(config);
  }

  if (reviewersToRun.length === 0) {
    throw new Error('No enabled reviewers found in configuration');
  }

  const promptPath = join(process.cwd(), '.tmp', 'review-prompt.txt');
  const metadataPath = join(process.cwd(), '.tmp', 'review-metadata.json');

  let metadata: ReviewMetadata;

  if (!existsSync(promptPath) || !existsSync(metadataPath)) {
    onProgress?.('📋 Auto-generating review prompt...');
    metadata = await generateReviewMetadata();
    await generateAndSaveReviewPrompt(metadata);
  } else {
    const { readFileSync } = await import('fs');
    const metadataContent = readFileSync(metadataPath, 'utf-8');
    metadata = JSON.parse(metadataContent) as ReviewMetadata;
    onProgress?.(`📖 Using existing review metadata: Story ${metadata.story_id}, Round ${metadata.round_number}`);
  }

  onProgress?.(`🚀 Starting ${reviewersToRun.length} reviewer(s) in parallel...`);

  const reviewPromises = reviewersToRun.map(async (reviewer) => {
    const result = await runReviewer(reviewer, promptPath, onProgress);

    if (result.success) {
      await postProcessReview(reviewer.name, metadata, onProgress);
    }

    return { reviewer: reviewer.name, result };
  });

  const results = await Promise.all(reviewPromises);

  const successful = results.filter((r) => r.result.success).length;
  const failed = results.filter((r) => !r.result.success).length;
  const timedOut = results.filter((r) => r.result.timedOut).length;

  return {
    successful,
    failed,
    timedOut,
    results,
  };
}

/**
 * Cleanup review metadata files
 */
export function cleanupReviewMetadata(): number {
  const filesToDelete = [
    join(process.cwd(), '.tmp', 'review-prompt.txt'),
    join(process.cwd(), '.tmp', 'review-metadata.json'),
    join(process.cwd(), '.tmp', 'claude-review.txt'),
    join(process.cwd(), '.tmp', 'codex-review.txt'),
    join(process.cwd(), '.tmp', 'qwen-review.txt'),
    join(process.cwd(), '.tmp', 'gemini-review.txt'),
  ];

  let deletedCount = 0;
  for (const file of filesToDelete) {
    try {
      if (existsSync(file)) {
        unlinkSync(file);
        deletedCount++;
      }
    } catch (_error) {
      // Ignore errors
    }
  }

  return deletedCount;
}
