export { initializeModel, generateEmbedding, cosineSimilarity } from '../../shared/embeddings.js';

import type { Plan } from '../types.js';

import { generateEmbedding } from '../../shared/embeddings.js';

/**
 * Generate embedding for a plan (domain-specific wrapper)
 * Combines summary + goal + decisions for better semantic search
 */
export async function generatePlanEmbedding(plan: Plan): Promise<number[] | null> {
  const embeddingText = `${plan.summary}\n${plan.goal}\n${plan.decisions}`;
  return generateEmbedding(embeddingText);
}
