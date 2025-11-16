/**
 * Parse Clojure files
 * Extracts: defn, defmacro, defprotocol
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseClojure : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse require/use statements
  const importRegex = /\(\s*(?:require|use)\s+\[([^\]]+)\]/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1).split(/\s+/)[0];
    imports.push(createImport(source, [source]));
  }

  // Parse defn (functions)
  const functionRegex = /\(\s*defn-?\s+(\S+)/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isPrivate = match[0].includes('defn-');

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: !isPrivate
    }));
  }

  // Parse defprotocol
  const protocolRegex = /\(\s*defprotocol\s+(\S+)/gm;
  for (const match of matchAll(protocolRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'interface', startLine, filePath, {
      isExported: true
    }));
  }

  return { symbols, imports };
};

export default parseClojure;
