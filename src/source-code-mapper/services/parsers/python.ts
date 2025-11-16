/**
 * Parse Python files with enhanced regex patterns
 * Extracts: functions, async functions, methods, classes, decorators
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parsePython: Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse imports (both 'import' and 'from...import')
  const importRegex = /^\s*(?:from\s+([\w.]+)\s+)?import\s+(.+?)(?:\s+as\s+\w+)?$/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    const importedStr = getCapture(match, 2);
    if (importedStr) {
      const imported = importedStr.split(',').map(s => s.trim().split(/\s+as\s+/)[0]?.trim() ?? '');
      imports.push(createImport(source, imported));
    }
  }

  // Parse function definitions (including async and decorators)
  const functionRegex = /^\s*(?:@\w+(?:\([^)]*\))?\s*)*(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*[^:]+)?:/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const params = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: !name.startsWith('_'),
      signature: `(${params})`
    }));
  }

  // Parse class definitions
  const classRegex = /^\s*class\s+(\w+)(?:\(([^)]*)\))?:/gm;
  for (const match of matchAll(classRegex, content)) {
    const name = getCapture(match, 1);
    const bases = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: !name.startsWith('_'),
      signature: bases ? `(${bases})` : undefined
    }));
  }

  return { symbols, imports };
};

export default parsePython;
