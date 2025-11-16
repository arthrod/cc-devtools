/**
 * Parse Fortran files
 * Extracts: programs, subroutines, functions, modules
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseFortran : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse use statements (imports)
  const importRegex = /^\s*use\s+(\w+)/gim;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    imports.push(createImport(source, [source]));
  }

  // Parse program definitions
  const programRegex = /^\s*program\s+(\w+)/gim;
  for (const match of matchAll(programRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse subroutines
  const subroutineRegex = /^\s*subroutine\s+(\w+)\s*\(([^)]*)\)/gim;
  for (const match of matchAll(subroutineRegex, content)) {
    const name = getCapture(match, 1);
    const params = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true,
      signature: `(${params})`
    }));
  }

  // Parse functions
  const functionRegex = /^\s*(?:recursive\s+)?(?:pure\s+)?(?:elemental\s+)?(?:\w+\s+)?function\s+(\w+)\s*\(([^)]*)\)/gim;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const params = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true,
      signature: `(${params})`
    }));
  }

  // Parse modules
  const moduleRegex = /^\s*module\s+(\w+)/gim;
  for (const match of matchAll(moduleRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  return { symbols, imports };
};

export default parseFortran;
