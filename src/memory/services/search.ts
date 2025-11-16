/**
 * Hybrid keyword + semantic search for memories
 */

import { readEmbeddings, saveEmbeddings } from '../core/storage.js';
import type { Memory, SearchResult } from '../types.js';

import { generateEmbedding } from '../../shared/embeddings.js';
import { hybridSearch, lazyRegenerateEmbeddings } from '../../shared/hybrid-search.js';

import type { KeywordScore } from '../../shared/types/search.js';

/**
 * Memory-specific keyword scoring function
 */
function scoreMemoryKeywords(query: string, memory: Memory): KeywordScore {
  const reasons: string[] = [];
  let score = 0;

  // Check tags for exact and partial matches
  for (const tag of memory.tags) {
    if (tag.toLowerCase() === query) {
      score += 1.0;
      reasons.push('exact tag match');
      break;
    } else if (tag.toLowerCase().includes(query)) {
      score += 0.7;
      reasons.push('partial tag match');
      break;
    }
  }

  // Check summary
  if (memory.summary.toLowerCase().includes(query)) {
    score += 0.7;
    reasons.push('summary match');
  }

  // Check details
  if (memory.details.toLowerCase().includes(query)) {
    score += 0.7;
    reasons.push('details match');
  }

  return { score, reasons };
}

/**
 * Generate embedding for a memory
 */
async function generateMemoryEmbedding(memory: Memory): Promise<number[] | null> {
  const text = `${memory.summary}\n${memory.details}`;
  return generateEmbedding(text);
}

/**
 * Search memories using hybrid keyword + semantic search
 */
export async function searchMemories(
  query: string,
  memories: Memory[],
  limit: number = 3
): Promise<SearchResult[]> {
  // Return recent memories for empty query
  if (query.trim() === '') {
    const sorted = [...memories].sort((a, b) => b.created_at - a.created_at);
    return sorted.slice(0, limit).map(memory => ({
      ...memory,
      score: 0,
      match_reason: 'recent memory'
    }));
  }

  // Ensure all memories have embeddings
  let embeddings = readEmbeddings();
  embeddings = await lazyRegenerateEmbeddings(
    memories,
    embeddings,
    generateMemoryEmbedding,
    saveEmbeddings
  );

  // Perform hybrid search
  const results = await hybridSearch({
    query,
    items: memories,
    embeddings,
    keywordScoreFn: scoreMemoryKeywords,
    generateEmbedding
  });

  // Convert to SearchResult format
  return results.slice(0, limit).map(({ item, score, reasons }) => ({
    ...item,
    score,
    match_reason: reasons.join(', ')
  }));
}
