export { initializeModel, generateEmbedding, cosineSimilarity } from '../../shared/embeddings.js';

import type { SymbolInfo } from '../types.js';

import { generateEmbedding } from '../../shared/embeddings.js';

/**
 * Generate embedding for a code symbol (domain-specific wrapper)
 * Creates context-aware text based on symbol type
 */
export async function generateSymbolEmbedding(symbol: SymbolInfo): Promise<number[] | null> {
  let embeddingText: string;

  switch (symbol.type) {
    case 'function':
      embeddingText = `${symbol.name} ${symbol.signature ?? ''}`.trim();
      break;
    case 'class':
      embeddingText = `${symbol.name} class`;
      break;
    case 'interface':
    case 'type':
      embeddingText = `${symbol.name} type`;
      break;
    case 'const':
      embeddingText = `${symbol.name} constant`;
      break;
    case 'enum':
      embeddingText = `${symbol.name} enum`;
      break;
    default:
      embeddingText = symbol.name;
  }

  return generateEmbedding(embeddingText);
}
