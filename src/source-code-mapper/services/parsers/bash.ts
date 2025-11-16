/**
 * Parse Bash/Shell scripts
 * Extracts: functions
 */

import { matchAll, getLineNumber, getCapture, createSymbol } from './types.js';

import type { Parser, SymbolInfo } from './types.js';

const parseBash : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];

  // Parse function declarations (both styles)
  const functionRegex = /^\s*(?:function\s+)?(\w+)\s*\(\s*\)\s*\{/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  return { symbols, imports: [] };
};

export default parseBash;
