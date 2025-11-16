/**
 * Memory store tool implementation
 */

import { join } from 'path';

import { v4 as uuidv4 } from 'uuid';

import { readMemories, saveMemories, readEmbeddings, saveEmbeddings } from '../core/storage.js';
import type { Memory, StoreResponse, StoreParams } from '../types.js';

import { generateEmbedding } from '../../shared/embeddings.js';
import { createValidationError } from '../../shared/errors.js';
import { withLock } from '../../shared/file-lock.js';


const MEMORY_FILE = join(process.cwd(), 'cc-devtools', 'memory.yaml');

/**
 * Store a new memory
 */
export async function storeMemory(params: StoreParams): Promise<StoreResponse> {
  const { summary, details, tags = [] } = params;

  if (!summary || typeof summary !== 'string' || summary.trim() === '') {
    throw createValidationError('Summary is required and must be a non-empty string');
  }

  if (!details || typeof details !== 'string' || details.trim() === '') {
    throw createValidationError('Details are required and must be a non-empty string');
  }

  if (!Array.isArray(tags)) {
    throw createValidationError('Tags must be an array');
  }

  const id = uuidv4();
  const created_at = Date.now();

  const text = `${summary}\n${details}`;
  const embedding = await generateEmbedding(text);

  let warning: string | undefined;
  if (!embedding) {
    warning = 'Warning: Failed to generate embedding. Memory stored but will have degraded search quality until embedding is regenerated.';
  }

  const memory: Memory = {
    id,
    summary: summary.trim(),
    details: details.trim(),
    tags: tags.map(t => String(t).trim()).filter(t => t.length > 0),
    created_at
  };

  await withLock(MEMORY_FILE, () => {
    const memories = readMemories();
    memories.push(memory);
    saveMemories(memories);

    const embeddings = readEmbeddings();
    embeddings[id] = embedding;
    saveEmbeddings(embeddings);
  });

  return {
    success: true,
    id,
    warning
  };
}
