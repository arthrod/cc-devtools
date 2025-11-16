/**
 * Parse MATLAB files
 * Extracts: functions, classes, methods
 */

import { matchAll, getLineNumber, getCapture, createSymbol } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseMatlab : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse function definitions
  const functionRegex = /^\s*function\s+(?:\[?[\w,\s]*\]?\s*=\s*)?(\w+)\s*\(([^)]*)\)/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const params = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true,
      signature: `(${params})`
    }));
  }

  // Parse classdef (classes)
  const classRegex = /^\s*classdef\s+(\w+)/gm;
  for (const match of matchAll(classRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse methods blocks
  const methodRegex = /^\s*function\s+(?:obj\s*=\s*)?(\w+)\s*\((?:obj|this)(?:,\s*([^)]*))?\)/gm;
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

export default parseMatlab;
