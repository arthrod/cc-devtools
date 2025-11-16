/**
 * Parse Dart files
 * Extracts: classes, functions, methods, enums, mixins
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseDart : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse imports
  const importRegex = /^\s*import\s+['"]([^'"]+)['"]/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    imports.push(createImport(source, [source.split('/').pop() ?? source]));
  }

  // Parse classes
  const classRegex = /^\s*(?:abstract\s+)?class\s+(\w+)(?:<[^>]*>)?(?:\s+(?:extends|implements|with)\s+[\w<>,.]+)?\s*\{/gm;
  for (const match of matchAll(classRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isPrivate = name.startsWith('_');

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: !isPrivate
    }));
  }

  // Parse functions
  const functionRegex = /^\s*(?:Future<[^>]+>|[\w<>]+)\s+(\w+)\s*\(([^)]*)\)/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const params = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);
    const isPrivate = name.startsWith('_');

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: !isPrivate,
      signature: `(${params})`
    }));
  }

  return { symbols, imports };
};

export default parseDart;
