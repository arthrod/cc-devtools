/**
 * Search functionality: keyword, semantic, and fuzzy search
 * Combines multiple search strategies with score merging
 */

import { generateEmbedding, cosineSimilarity } from '../core/embeddings.js';
import type { Index, SearchResult, SearchFilters, SearchMode, SymbolInfo } from '../types.js';

const DEFAULT_LIMIT = 10;

export async function searchSymbols(
  index: Index,
  query: string,
  mode: SearchMode = 'semantic',
  filters?: SearchFilters,
  limit: number = DEFAULT_LIMIT
): Promise<SearchResult[]> {
  let results: SearchResult[] = [];

  switch (mode) {
    case 'exact':
      results = keywordSearch(index, query, filters);
      break;
    case 'fuzzy':
      results = fuzzySearch(index, query, filters);
      break;
    case 'semantic':
    default:
      results = await semanticSearchWithKeyword(index, query, filters);
      break;
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

function keywordSearch(
  index: Index,
  query: string,
  filters?: SearchFilters
): SearchResult[] {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  for (const [file, symbols] of index.symbols.entries()) {
    for (const symbol of symbols) {
      if (filters && !matchesFilters(symbol, filters)) {
        continue;
      }

      const nameLower = symbol.name.toLowerCase();
      let score = 0;
      let matchReason = '';

      if (nameLower === queryLower) {
        score = 1.0;
        matchReason = 'exact name match';
      } else if (nameLower.includes(queryLower)) {
        score = 0.7;
        matchReason = 'partial name match';
      } else if (file.toLowerCase().includes(queryLower)) {
        score = 0.5;
        matchReason = 'file path match';
      }

      if (score > 0) {
        results.push({
          ...symbol,
          score,
          match_reason: matchReason
        });
      }
    }
  }

  return results;
}

async function semanticSearchWithKeyword(
  index: Index,
  query: string,
  filters?: SearchFilters
): Promise<SearchResult[]> {
  const keywordResults = keywordSearch(index, query, filters);
  const semanticResults = await semanticSearch(index, query, filters);

  const mergedMap = new Map<string, SearchResult>();

  for (const result of keywordResults) {
    const key = `${result.file}:${result.name}:${result.startLine}`;
    mergedMap.set(key, result);
  }

  for (const result of semanticResults) {
    const key = `${result.file}:${result.name}:${result.startLine}`;
    const existing = mergedMap.get(key);

    if (existing) {
      existing.score += result.score;
      existing.match_reason = `${existing.match_reason} + ${result.match_reason}`;
    } else {
      mergedMap.set(key, result);
    }
  }

  return Array.from(mergedMap.values());
}

async function semanticSearch(
  index: Index,
  query: string,
  filters?: SearchFilters
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const queryEmbedding = await generateEmbedding(query);

  if (!queryEmbedding) {
    return results;
  }

  for (const [embeddingKey, symbolEmbedding] of index.embeddings.entries()) {
    const [symbolFile, name, lineStr] = embeddingKey.split(':');
    const startLine = parseInt(lineStr, 10);

    let symbol = null;
    const fileSymbols = index.symbols.get(symbolFile);
    if (fileSymbols) {
      symbol = fileSymbols.find(s => s.name === name && s.startLine === startLine);
    }

    if (!symbol) continue;

    if (filters && !matchesFilters(symbol, filters)) {
      continue;
    }

    const similarity = cosineSimilarity(queryEmbedding, Array.from(symbolEmbedding));

    if (similarity > 0.3) {
      results.push({
        ...symbol,
        score: similarity,
        match_reason: 'semantic similarity'
      });
    }
  }

  return results;
}

function fuzzySearch(
  index: Index,
  query: string,
  filters?: SearchFilters
): SearchResult[] {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();

  for (const symbols of index.symbols.values()) {
    for (const symbol of symbols) {
      if (filters && !matchesFilters(symbol, filters)) {
        continue;
      }

      const nameLower = symbol.name.toLowerCase();
      const distance = levenshteinDistance(queryLower, nameLower);
      const maxLen = Math.max(queryLower.length, nameLower.length);
      const score = 1 - distance / maxLen;

      if (score > 0.5) {
        results.push({
          ...symbol,
          score,
          match_reason: 'fuzzy match'
        });
      }
    }
  }

  return results;
}

function matchesFilters(symbol: Pick<SymbolInfo, 'type' | 'isExported'>, filters: SearchFilters): boolean {
  if (filters.type && !filters.type.includes(symbol.type as 'function' | 'class' | 'interface' | 'type' | 'const' | 'enum')) {
    return false;
  }

  if (filters.exported_only && !symbol.isExported) {
    return false;
  }

  return true;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
