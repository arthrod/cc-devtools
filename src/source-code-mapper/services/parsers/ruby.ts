/**
 * Parse Ruby files
 * Extracts: modules, classes, methods, constants
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseRuby : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse require statements
  const importRegex = /^\s*require(?:_relative)?\s+['"]([^'"]+)['"]/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    imports.push(createImport(source, [source.split('/').pop() ?? source]));
  }

  // Parse classes
  const classRegex = /^\s*class\s+(\w+)(?:\s*<\s*[\w:]+)?\s*$/gm;
  for (const match of matchAll(classRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse modules
  const moduleRegex = /^\s*module\s+(\w+)\s*$/gm;
  for (const match of matchAll(moduleRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse methods (def)
  const methodRegex = /^\s*def\s+(?:self\.)?(\w+[!?]?)(?:\(([^)]*)\))?\s*$/gm;
  for (const match of matchAll(methodRegex, content)) {
    const name = getCapture(match, 1);
    const params = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true,
      signature: params ? `(${params})` : undefined
    }));
  }

  return { symbols, imports };
};

export default parseRuby;
