/**
 * Parse Assembly files
 * Extracts: labels, procedures, functions, macros
 */

import { matchAll, getLineNumber, getCapture, createSymbol } from './types.js';

import type { Parser, SymbolInfo } from './types.js';

const parseAssembly : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];

  // Parse labels (various assembly syntaxes)
  const labelRegex = /^(\w+):/gm;
  for (const match of matchAll(labelRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse procedures (PROC in some assemblies)
  const procRegex = /^\s*(\w+)\s+PROC/gim;
  for (const match of matchAll(procRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse macros
  const macroRegex = /^\s*(?:MACRO|macro)\s+(\w+)/gm;
  for (const match of matchAll(macroRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse .globl/.global directives (exported symbols)
  const globalRegex = /^\s*\.(?:globl|global)\s+(\w+)/gm;
  for (const match of matchAll(globalRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  return { symbols, imports: [] };
};

export default parseAssembly;
