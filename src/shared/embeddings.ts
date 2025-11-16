/**
 * Generic local embedding generation using @xenova/transformers
 * Shared across all MCP servers that need semantic search
 */

import { pipeline } from '@xenova/transformers';

import type { FeatureExtractionPipeline } from '@xenova/transformers';

let embeddingPipeline: FeatureExtractionPipeline | null = null;

/**
 * Initialize the embedding model
 * @param modelName - Optional model name (defaults to Xenova/all-MiniLM-L6-v2)
 * @param timeoutMs - Timeout in milliseconds (default: 60000ms / 1 minute)
 */
export async function initializeModel(modelName = 'Xenova/all-MiniLM-L6-v2', timeoutMs = 60000): Promise<void> {
  if (embeddingPipeline) {
    return;
  }

  try {
    embeddingPipeline = await Promise.race([
      pipeline('feature-extraction', modelName),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Model initialization timeout')), timeoutMs)
      )
    ]);
  } catch (error) {
    throw new Error(`Failed to initialize embedding model: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate embedding for text
 * @param text - Text to embed
 * @returns Embedding vector or null if model not initialized
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!embeddingPipeline) {
    return null;
  }

  try {
    const output = await embeddingPipeline(text, {
      pooling: 'mean',
      normalize: true
    });

    return Array.from(output.data) as number[];
  } catch (_error) {
    return null;
  }
}

/**
 * Calculate cosine similarity between two embeddings
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Similarity score between 0 and 1
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  // Handle zero vectors to avoid NaN
  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
