/**
 * Parse R files
 * Extracts: functions, S3/S4 classes, methods
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseR : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse library/require statements
  const importRegex = /(?:library|require)\s*\(\s*(?:["'])?(\w+)/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    imports.push(createImport(source, [source]));
  }

  // Parse function assignments
  const functionRegex = /^\s*(\w+)\s*<-\s*function\s*\(([^)]*)\)/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const params = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true,
      signature: `(${params})`
    }));
  }

  // Parse setClass (S4 classes)
  const classRegex = /setClass\s*\(\s*["'](\w+)["']/gm;
  for (const match of matchAll(classRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  return { symbols, imports };
};

export default parseR;
