/**
 * Parse generic/unknown language files
 * Extracts: basic function patterns (works for many C-style languages)
 */

import { matchAll, getLineNumber, getCapture, createSymbol } from './types.js';

import type { Parser, SymbolInfo } from './types.js';

const parseGeneric : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];

  // Generic function pattern (works for many C-style languages)
  const functionRegex = /^\s*(?:public|private|protected|static|export)?\s*(?:\w+\s+)?(\w+)\s*\([^)]*\)\s*{/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    if (name === 'if' || name === 'for' || name === 'while' || name === 'switch') continue;

    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  return { symbols, imports: [] };
};

export default parseGeneric;
