/**
 * Parse Perl files
 * Extracts: subroutines, packages
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parsePerl : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse use/require statements
  const importRegex = /^\s*(?:use|require)\s+([\w:]+)/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    imports.push(createImport(source, [source.split('::').pop() ?? source]));
  }

  // Parse packages
  const packageRegex = /^\s*package\s+([\w:]+)/gm;
  for (const match of matchAll(packageRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse subroutines
  const subRegex = /^\s*sub\s+(\w+)\s*\{/gm;
  for (const match of matchAll(subRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  return { symbols, imports };
};

export default parsePerl;
