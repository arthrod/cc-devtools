/**
 * Parse Elixir files
 * Extracts: modules, functions, defmacro
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseElixir : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse imports/aliases
  const importRegex = /^\s*(?:import|alias|require)\s+([\w.]+)/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    imports.push(createImport(source, [source.split('.').pop() ?? source]));
  }

  // Parse defmodule
  const moduleRegex = /^\s*defmodule\s+([\w.]+)\s+do/gm;
  for (const match of matchAll(moduleRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse def/defp (public/private functions)
  const functionRegex = /^\s*(def|defp)\s+(\w+)(?:\(([^)]*)\))?/gm;
  for (const match of matchAll(functionRegex, content)) {
    const isPrivate = getCapture(match, 1) === 'defp';
    const name = getCapture(match, 2);
    const params = getCapture(match, 3);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: !isPrivate,
      signature: params ? `(${params})` : undefined
    }));
  }

  return { symbols, imports };
};

export default parseElixir;
