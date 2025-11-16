/**
 * Parse Julia files
 * Extracts: functions, types (struct), modules
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseJulia : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse using/import statements
  const importRegex = /^\s*(?:using|import)\s+([\w.]+)/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    imports.push(createImport(source, [source.split('.').pop() ?? source]));
  }

  // Parse functions
  const functionRegex = /^\s*function\s+(\w+)(?:\(([^)]*)\))?/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const params = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true,
      signature: params ? `(${params})` : undefined
    }));
  }

  // Parse struct (types)
  const structRegex = /^\s*(?:mutable\s+)?struct\s+(\w+)/gm;
  for (const match of matchAll(structRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'type', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse modules
  const moduleRegex = /^\s*module\s+(\w+)/gm;
  for (const match of matchAll(moduleRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  return { symbols, imports };
};

export default parseJulia;
