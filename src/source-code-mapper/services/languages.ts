/**
 * Language detection for regex parser
 * Maps file extensions to language identifiers for parser selection
 */

import { extname } from 'path';

import { SUPPORTED_LANGUAGES } from '../types.js';

export function getLanguageForFile(filePath: string): string | null {
  const ext = extname(filePath).toLowerCase();

  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang.extensions.includes(ext)) {
      return lang.name;
    }
  }

  return null;
}
