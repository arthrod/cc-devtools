/**
 * Parse Swift files
 * Extracts: classes, structs, enums, protocols, functions, methods
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseSwift : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse imports
  const importRegex = /^\s*import\s+([\w.]+)/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    imports.push(createImport(source, [source.split('.').pop() ?? source]));
  }

  // Parse classes
  const classRegex = /^\s*(?:public|private|internal|fileprivate|open)?\s*(?:final\s+)?class\s+(\w+)(?:<[^>]*>)?(?:\s*:\s*[\w<>,.]+)?\s*\{/gm;
  for (const match of matchAll(classRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = match[0].includes('public') || match[0].includes('open');

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported
    }));
  }

  // Parse structs
  const structRegex = /^\s*(?:public|private|internal|fileprivate)?\s*struct\s+(\w+)(?:<[^>]*>)?(?:\s*:\s*[\w<>,.]+)?\s*\{/gm;
  for (const match of matchAll(structRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = match[0].includes('public');

    symbols.push(createSymbol(name, 'type', startLine, filePath, {
      isExported
    }));
  }

  // Parse enums
  const enumRegex = /^\s*(?:public|private|internal|fileprivate)?\s*enum\s+(\w+)(?:<[^>]*>)?(?:\s*:\s*[\w<>,.]+)?\s*\{/gm;
  for (const match of matchAll(enumRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = match[0].includes('public');

    symbols.push(createSymbol(name, 'enum', startLine, filePath, {
      isExported
    }));
  }

  // Parse protocols
  const protocolRegex = /^\s*(?:public|private|internal|fileprivate)?\s*protocol\s+(\w+)(?:\s*:\s*[\w<>,.]+)?\s*\{/gm;
  for (const match of matchAll(protocolRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = match[0].includes('public');

    symbols.push(createSymbol(name, 'interface', startLine, filePath, {
      isExported
    }));
  }

  // Parse functions
  const functionRegex = /^\s*(?:public|private|internal|fileprivate|open)?\s*(?:static\s+)?func\s+(\w+)(?:<[^>]*>)?\s*\(([^)]*)\)/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const params = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);
    const isPrivate = match[0].includes('private');

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: !isPrivate,
      signature: `(${params})`
    }));
  }

  return { symbols, imports };
};

export default parseSwift;
