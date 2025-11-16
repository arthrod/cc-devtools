/**
 * Generic hybrid keyword + semantic search
 */

import { cosineSimilarity } from './embeddings.js';

import type {
  SearchableItem,
  EmbeddingCache,
  ScoredResult,
  KeywordScoringFn,
  EmbeddingGeneratorFn,
  SaveEmbeddingsFn,
  HybridSearchOptions,
} from './types/search.js';

/**
 * Keyword search with custom scoring function
 */
export function keywordSearch<T extends SearchableItem>(
  query: string,
  items: T[],
  scoreFn: KeywordScoringFn<T>
): Map<string, ScoredResult<T>> {
  const results = new Map<string, ScoredResult<T>>();
  const queryLower = query.toLowerCase();

  for (const item of items) {
    const { score, reasons } = scoreFn(queryLower, item);

    if (score > 0) {
      results.set(item.id, { item, score, reasons });
    }
  }

  return results;
}

/**
 * Semantic search using embeddings
 */
export function semanticSearch<T extends SearchableItem>(
  queryEmbedding: number[] | null,
  items: T[],
  embeddings: EmbeddingCache,
  similarityThreshold: number = 0.3
): Map<string, ScoredResult<T>> {
  const results = new Map<string, ScoredResult<T>>();

  if (!queryEmbedding) {
    return results;
  }

  for (const item of items) {
    const embedding = embeddings[item.id];
    if (!embedding) {
      continue;
    }

    const similarity = cosineSimilarity(queryEmbedding, embedding);
    if (similarity > similarityThreshold) {
      results.set(item.id, {
        item,
        score: similarity,
        reasons: [`semantic similarity: ${similarity.toFixed(2)}`]
      });
    }
  }

  return results;
}

/**
 * Merge keyword and semantic search results
 */
export function mergeScores<T extends SearchableItem>(
  keywordResults: Map<string, ScoredResult<T>>,
  semanticResults: Map<string, ScoredResult<T>>
): ScoredResult<T>[] {
  const merged = new Map<string, ScoredResult<T>>();

  // Add keyword results
  for (const [id, result] of keywordResults) {
    merged.set(id, result);
  }

  // Add/merge semantic results
  for (const [id, result] of semanticResults) {
    const existing = merged.get(id);
    if (existing) {
      existing.score += result.score;
      existing.reasons.push(...result.reasons);
    } else {
      merged.set(id, result);
    }
  }

  // Sort by score descending
  return Array.from(merged.values()).sort((a, b) => b.score - a.score);
}

/**
 * Lazy regenerate missing embeddings
 */
export async function lazyRegenerateEmbeddings<T extends SearchableItem>(
  items: T[],
  embeddings: EmbeddingCache,
  generateEmbedding: EmbeddingGeneratorFn<T>,
  saveEmbeddings: SaveEmbeddingsFn
): Promise<EmbeddingCache> {
  let updated = false;
  const newEmbeddings = { ...embeddings };

  for (const item of items) {
    if (!(item.id in newEmbeddings)) {
      const embedding = await generateEmbedding(item);
      newEmbeddings[item.id] = embedding;
      updated = true;
    }
  }

  if (updated) {
    await saveEmbeddings(newEmbeddings);
  }

  return newEmbeddings;
}

/**
 * Perform hybrid keyword + semantic search
 */
export async function hybridSearch<T extends SearchableItem>(
  options: HybridSearchOptions<T>
): Promise<ScoredResult<T>[]> {
  const {
    query,
    items,
    embeddings,
    keywordScoreFn,
    generateEmbedding,
    similarityThreshold = 0.3
  } = options;

  const queryEmbedding = await generateEmbedding(query);

  const keywordResults = keywordSearch(query, items, keywordScoreFn);
  const semanticResults = semanticSearch(queryEmbedding, items, embeddings, similarityThreshold);

  return mergeScores(keywordResults, semanticResults);
}
