/**
 * Parse C# files
 * Extracts: classes, interfaces, structs, enums, methods, properties
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseCSharp : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse using directives
  const importRegex = /^\s*using\s+([\w.]+);/gm;
  for (const match of matchAll(importRegex, content)) {
    const importPath = getCapture(match, 1);
    const imported = [importPath.split('.').pop() ?? importPath];
    imports.push(createImport(importPath, imported));
  }

  // Parse classes
  const classRegex = /^\s*(?:public|private|protected|internal)?\s*(?:static\s+)?(?:partial\s+)?(?:abstract\s+)?(?:sealed\s+)?class\s+(\w+)(?:<[^>]*>)?(?:\s*:\s*[\w<>,.]+)?\s*\{/gm;
  for (const match of matchAll(classRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = match[0].includes('public');

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported
    }));
  }

  // Parse interfaces
  const interfaceRegex = /^\s*(?:public|private|protected|internal)?\s*interface\s+(\w+)(?:<[^>]*>)?(?:\s*:\s*[\w<>,.]+)?\s*\{/gm;
  for (const match of matchAll(interfaceRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = match[0].includes('public');

    symbols.push(createSymbol(name, 'interface', startLine, filePath, {
      isExported
    }));
  }

  // Parse structs
  const structRegex = /^\s*(?:public|private|protected|internal)?\s*struct\s+(\w+)(?:<[^>]*>)?\s*\{/gm;
  for (const match of matchAll(structRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = match[0].includes('public');

    symbols.push(createSymbol(name, 'type', startLine, filePath, {
      isExported
    }));
  }

  // Parse enums
  const enumRegex = /^\s*(?:public|private|protected|internal)?\s*enum\s+(\w+)\s*\{/gm;
  for (const match of matchAll(enumRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = match[0].includes('public');

    symbols.push(createSymbol(name, 'enum', startLine, filePath, {
      isExported
    }));
  }

  // Parse methods
  const methodRegex = /^\s*(?:public|private|protected|internal)?\s*(?:static\s+)?(?:virtual\s+)?(?:override\s+)?(?:async\s+)?(?:\w+(?:<[^>]*>)?(?:\[\])?\s+)?(\w+)\s*\(([^)]*)\)\s*\{/gm;
  for (const match of matchAll(methodRegex, content)) {
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

export default parseCSharp;
