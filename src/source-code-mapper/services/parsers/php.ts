/**
 * Parse PHP files
 * Extracts: classes, interfaces, traits, functions, methods, constants
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parsePHP : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse namespace use statements
  const importRegex = /^\s*use\s+([\w\\]+)(?:\s+as\s+\w+)?;/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    const imported = [source.split('\\').pop() ?? source];
    imports.push(createImport(source, imported));
  }

  // Parse classes
  const classRegex = /^\s*(?:abstract\s+)?(?:final\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[\w,\s]+)?\s*\{/gm;
  for (const match of matchAll(classRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse interfaces
  const interfaceRegex = /^\s*interface\s+(\w+)(?:\s+extends\s+[\w,\s]+)?\s*\{/gm;
  for (const match of matchAll(interfaceRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'interface', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse traits
  const traitRegex = /^\s*trait\s+(\w+)\s*\{/gm;
  for (const match of matchAll(traitRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'interface', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse functions
  const functionRegex = /^\s*function\s+(\w+)\s*\(([^)]*)\)/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const params = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true,
      signature: `(${params})`
    }));
  }

  // Parse methods (public/private/protected)
  const methodRegex = /^\s*(?:public|private|protected)\s+(?:static\s+)?function\s+(\w+)\s*\(([^)]*)\)/gm;
  for (const match of matchAll(methodRegex, content)) {
    const name = getCapture(match, 1);
    const params = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);
    const isPrivate = match[0].includes('private');

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: !isPrivate,
      signature: `(${params})`
    }));
  }

  return { symbols, imports };
};

export default parsePHP;
