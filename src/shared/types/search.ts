/**
 * Hybrid search types
 */

export interface SearchableItem {
  id: string;
}

export interface EmbeddingCache {
  [id: string]: number[] | null;
}

export interface ScoredResult<T> {
  item: T;
  score: number;
  reasons: string[];
}

// @type-duplicate-allowed
export interface KeywordScore {
  score: number;
  reasons: string[];
}

export interface KeywordScoringFn<T extends SearchableItem> {
  (query: string, item: T): KeywordScore;
}

export interface EmbeddingGeneratorFn<T extends SearchableItem> {
  (item: T): Promise<number[] | null>;
}

export interface SaveEmbeddingsFn {
  (embeddings: EmbeddingCache): void | Promise<void>;
}

export interface HybridSearchOptions<T extends SearchableItem> {
  query: string;
  items: T[];
  embeddings: EmbeddingCache;
  keywordScoreFn: KeywordScoringFn<T>;
  generateEmbedding: (query: string) => Promise<number[] | null>;
  similarityThreshold?: number;
}
