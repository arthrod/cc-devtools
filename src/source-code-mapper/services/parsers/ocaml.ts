/**
 * Parse OCaml files
 * Extracts: modules, types, functions, classes
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseOCaml : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse open statements
  const importRegex = /^\s*open\s+([\w.]+)/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    imports.push(createImport(source, [source.split('.').pop() ?? source]));
  }

  // Parse let bindings (functions)
  const functionRegex = /^\s*let\s+(?:rec\s+)?(\w+)/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse type definitions
  const typeRegex = /^\s*type\s+(\w+)/gm;
  for (const match of matchAll(typeRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'type', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse modules
  const moduleRegex = /^\s*module\s+(\w+)/gm;
  for (const match of matchAll(moduleRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  return { symbols, imports };
};

export default parseOCaml;
