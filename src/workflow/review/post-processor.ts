/**
 * Review post-processing - stores reviews to kanban
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import type { ReviewMetadata } from '../types/review.js';

import { addReview } from '../../kanban/services/review-storage.js';

/**
 * Post-process a completed review by reading the review file and adding to reviews.yaml
 */
export async function postProcessReview(
  reviewerName: string,
  metadata: ReviewMetadata,
  onProgress?: (message: string) => void
): Promise<boolean> {
  const reviewFilePath = join(
    process.cwd(),
    '.tmp',
    `${reviewerName.toLowerCase()}-review.txt`
  );

  if (!existsSync(reviewFilePath)) {
    onProgress?.(
      `[${reviewerName}] ⚠️  Review file not found at ${reviewFilePath}`
    );
    return false;
  }

  onProgress?.(`[${reviewerName}] Adding review to reviews.yaml...`);

  try {
    const reviewContent = readFileSync(reviewFilePath, 'utf-8');

    await addReview(
      metadata.story_id,
      metadata.round_number,
      reviewerName.toLowerCase(),
      reviewContent
    );

    onProgress?.(
      `[${reviewerName}] ✅ Review added to reviews.yaml successfully`
    );
    return true;
  } catch (error) {
    onProgress?.(
      `[${reviewerName}] ❌ Failed to add review: ${(error as Error).message}`
    );
    return false;
  }
}
