/**
 * Parse Lua files
 * Extracts: functions, local functions
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseLua : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse require statements
  const importRegex = /require\s*(?:\()?['"]([^'"]+)['"]/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    imports.push(createImport(source, [source.split('/').pop() ?? source]));
  }

  // Parse functions
  const functionRegex = /^\s*(?:local\s+)?function\s+(?:(\w+):)?(\w+)\s*\(([^)]*)\)/gm;
  for (const match of matchAll(functionRegex, content)) {
    const className = getCapture(match, 1);
    const name = getCapture(match, 2);
    const params = getCapture(match, 3);
    const startLine = getLineNumber(content, match.index);
    const isLocal = match[0].includes('local');

    symbols.push(createSymbol(className ? `${className}:${name}` : name, 'function', startLine, filePath, {
      isExported: !isLocal,
      signature: `(${params})`
    }));
  }

  return { symbols, imports };
};

export default parseLua;
