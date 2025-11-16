import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

import * as yaml from 'js-yaml';

import type { StoryReviewFeedback } from '../types.js';

import { createFileError } from '../../shared/errors.js';
import { withLock } from '../../shared/file-lock.js';

/**
 * Reviews data structure
 */
interface ReviewsData {
  reviews: StoryReviewFeedback[];
}

/**
 * Get the reviews file path (evaluated at runtime to support testing)
 * The reviews.yaml is stored in the USER's project at cc-devtools/reviews.yaml
 */
function getReviewsFilePath(): string {
  return join(process.cwd(), 'cc-devtools', 'reviews.yaml');
}

/**
 * Read entire reviews.yaml file (internal - no lock)
 * @returns { reviews: Array }
 */
function readReviewsFile(): ReviewsData {
  const reviewsFile = getReviewsFilePath();
  try {
    if (!existsSync(reviewsFile)) {
      return { reviews: [] };
    }

    const content = readFileSync(reviewsFile, 'utf-8');
    const data = yaml.load(content) as Partial<ReviewsData>;

    if (!data.reviews) {
      data.reviews = [];
    }

    return data as ReviewsData;
  } catch (error) {
    throw createFileError(`Failed to read ${reviewsFile}`, error as Error);
  }
}

/**
 * Write entire reviews.yaml file (internal - assumes caller has lock)
 * @param data - { reviews: Array }
 */
function writeReviewsFile(data: ReviewsData): void {
  const reviewsFile = getReviewsFilePath();
  try {
    const dir = dirname(reviewsFile);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const yamlContent = yaml.dump(data, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
    writeFileSync(reviewsFile, yamlContent, 'utf-8');
  } catch (error) {
    throw createFileError(`Failed to write ${reviewsFile}`, error as Error);
  }
}

/**
 * Add a review to reviews.yaml
 * @param storyId - Story ID
 * @param round - Review round number
 * @param reviewer - Reviewer name
 * @param review - Review content
 * @returns The created review object
 */
export function addReview(
  storyId: string,
  round: number,
  reviewer: string,
  review: string
): Promise<StoryReviewFeedback> {
  return withLock(getReviewsFilePath(), () => {
    const data = readReviewsFile();

    const newReview: StoryReviewFeedback = {
      storyId,
      round,
      reviewer,
      review,
      timestamp: new Date().toISOString()
    };

    data.reviews.push(newReview);
    writeReviewsFile(data);

    return newReview;
  });
}

/**
 * Get a specific review
 * @param storyId - Story ID
 * @param round - Review round number
 * @param reviewer - Reviewer name
 * @returns Review object or null if not found
 */
export function getReview(
  storyId: string,
  round: number,
  reviewer: string
): Promise<StoryReviewFeedback | null> {
  return withLock(getReviewsFilePath(), () => {
    const data = readReviewsFile();

    const review = data.reviews.find(
      r => r.storyId === storyId && r.round === round && r.reviewer === reviewer
    );

    return review ?? null;
  });
}

/**
 * Get reviewers grouped by round for a story
 * @param storyId - Story ID
 * @returns Array of rounds with their reviewers
 */
export function getRoundReviewers(storyId: string): Promise<{
  storyId: string;
  rounds: Array<{ round: number; reviewers: string[] }>;
}> {
  return withLock(getReviewsFilePath(), () => {
    const data = readReviewsFile();

    const storyReviews = data.reviews.filter(r => r.storyId === storyId);

    const roundsMap = new Map<number, Set<string>>();

    for (const review of storyReviews) {
      if (!roundsMap.has(review.round)) {
        roundsMap.set(review.round, new Set());
      }
      roundsMap.get(review.round)?.add(review.reviewer);
    }

    const rounds = Array.from(roundsMap.entries())
      .map(([round, reviewers]) => ({
        round,
        reviewers: Array.from(reviewers)
      }))
      .sort((a, b) => a.round - b.round);

    return {
      storyId,
      rounds
    };
  });
}

/**
 * Get all reviews for a story (for testing/debugging)
 * @param storyId - Story ID
 * @returns Array of reviews for the story
 */
export function getAllReviewsForStory(storyId: string): Promise<StoryReviewFeedback[]> {
  return withLock(getReviewsFilePath(), () => {
    const data = readReviewsFile();
    return data.reviews.filter(r => r.storyId === storyId);
  });
}
