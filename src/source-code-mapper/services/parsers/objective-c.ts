/**
 * Parse Objective-C files
 * Extracts: interfaces, implementations, methods, protocols
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseObjectiveC : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse imports
  const importRegex = /^\s*#import\s+[<"]([^>"]+)[>"]/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    imports.push(createImport(source, [source.split('/').pop() ?? source]));
  }

  // Parse @interface
  const interfaceRegex = /^\s*@interface\s+(\w+)\s*(?::\s*\w+)?/gm;
  for (const match of matchAll(interfaceRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse @protocol
  const protocolRegex = /^\s*@protocol\s+(\w+)/gm;
  for (const match of matchAll(protocolRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'interface', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse methods
  const methodRegex = /^\s*[-+]\s*\([^)]+\)\s*(\w+)/gm;
  for (const match of matchAll(methodRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  return { symbols, imports };
};

export default parseObjectiveC;
