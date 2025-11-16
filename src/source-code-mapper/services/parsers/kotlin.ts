/**
 * Parse Kotlin files
 * Extracts: classes, interfaces, objects, functions, properties
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseKotlin : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse imports
  const importRegex = /^\s*import\s+([\w.]+)(?:\s+as\s+\w+)?/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    const imported = [source.split('.').pop() ?? source];
    imports.push(createImport(source, imported));
  }

  // Parse classes
  const classRegex = /^\s*(?:public|private|protected|internal)?\s*(?:abstract|final|open|sealed)?\s*(?:data\s+)?class\s+(\w+)(?:<[^>]*>)?(?:\s*\([^)]*\))?(?:\s*:\s*[\w<>,.()]+)?\s*\{?/gm;
  for (const match of matchAll(classRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = !match[0].includes('private');

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported
    }));
  }

  // Parse interfaces
  const interfaceRegex = /^\s*(?:public|private|protected|internal)?\s*interface\s+(\w+)(?:<[^>]*>)?\s*\{?/gm;
  for (const match of matchAll(interfaceRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = !match[0].includes('private');

    symbols.push(createSymbol(name, 'interface', startLine, filePath, {
      isExported
    }));
  }

  // Parse objects
  const objectRegex = /^\s*(?:public|private|protected|internal)?\s*(?:companion\s+)?object\s+(\w+)\s*\{?/gm;
  for (const match of matchAll(objectRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = !match[0].includes('private');

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported
    }));
  }

  // Parse functions
  const functionRegex = /^\s*(?:public|private|protected|internal)?\s*(?:suspend\s+)?(?:inline\s+)?(?:infix\s+)?(?:operator\s+)?fun\s+(?:<[^>]*>\s+)?(\w+)\s*\(([^)]*)\)/gm;
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

export default parseKotlin;
