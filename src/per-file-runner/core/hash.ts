/**
 * File hashing utilities
 */

import { createHash } from 'crypto';
import { readFile } from 'fs/promises';

/**
 * Calculate MD5 hash of a file
 */
export async function calculateFileHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  const hash = createHash('md5');
  hash.update(content);
  return hash.digest('hex');
}
