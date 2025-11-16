/**
 * Parse Scala files
 * Extracts: classes, objects, traits, functions (def), case classes
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseScala : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse imports
  const importRegex = /^\s*import\s+([\w.]+)(?:\.\{([^}]+)\})?/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    const namedImports = getCapture(match, 2);

    if (namedImports) {
      const imported = namedImports.split(',').map(s => s.trim());
      imports.push(createImport(source, imported));
    } else {
      imports.push(createImport(source, [source.split('.').pop() ?? source]));
    }
  }

  // Parse classes, case classes, objects, traits
  const classRegex = /^\s*(?:(?:sealed|abstract|final)\s+)?(?:case\s+)?(?:class|object|trait)\s+(\w+)(?:\[([^\]]*)\])?/gm;
  for (const match of matchAll(classRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isTrait = match[0].includes('trait');

    symbols.push(createSymbol(name, isTrait ? 'interface' : 'class', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse def (functions/methods)
  const functionRegex = /^\s*def\s+(\w+)(?:\[([^\]]*)\])?\s*\(([^)]*)\)/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const params = getCapture(match, 3);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true,
      signature: `(${params})`
    }));
  }

  return { symbols, imports };
};

export default parseScala;
