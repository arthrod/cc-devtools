/**
 * Parse Haskell files
 * Extracts: functions, data types, type classes
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseHaskell : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse imports
  const importRegex = /^\s*import\s+(?:qualified\s+)?([\w.]+)/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    imports.push(createImport(source, [source.split('.').pop() ?? source]));
  }

  // Parse function type signatures (as a heuristic for function names)
  const functionRegex = /^\s*(\w+)\s*::/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse data type declarations
  const dataRegex = /^\s*data\s+(\w+)/gm;
  for (const match of matchAll(dataRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'type', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse type classes
  const classRegex = /^\s*class\s+(\w+)/gm;
  for (const match of matchAll(classRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'interface', startLine, filePath, {
      isExported: true
    }));
  }

  return { symbols, imports };
};

export default parseHaskell;
