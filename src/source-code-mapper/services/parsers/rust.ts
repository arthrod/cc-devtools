/**
 * Parse Rust files
 * Extracts: functions, structs, enums, traits, impl blocks, constants
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseRust : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse use statements
  const importRegex = /^\s*(?:pub\s+)?use\s+([\w:]+)(?:\s*::\s*\{([^}]+)\})?;/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    const namedImports = getCapture(match, 2);

    if (namedImports) {
      const imported = namedImports.split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
      imports.push(createImport(source, imported));
    } else {
      imports.push(createImport(source, [source.split('::').pop() ?? source]));
    }
  }

  // Parse functions
  const functionRegex = /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:const\s+)?(?:async\s+)?(?:unsafe\s+)?(?:extern\s+(?:"[^"]*"\s+)?)?fn\s+(\w+)(?:<[^>]*>)?\s*\(([^)]*)\)/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const params = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);
    const isExported = match[0].includes('pub');

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported,
      signature: `(${params})`
    }));
  }

  // Parse structs
  const structRegex = /^\s*(?:pub(?:\([^)]*\))?\s+)?struct\s+(\w+)(?:<[^>]*>)?\s*[{;]/gm;
  for (const match of matchAll(structRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = match[0].includes('pub');

    symbols.push(createSymbol(name, 'type', startLine, filePath, {
      isExported
    }));
  }

  // Parse enums
  const enumRegex = /^\s*(?:pub(?:\([^)]*\))?\s+)?enum\s+(\w+)(?:<[^>]*>)?\s*\{/gm;
  for (const match of matchAll(enumRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = match[0].includes('pub');

    symbols.push(createSymbol(name, 'enum', startLine, filePath, {
      isExported
    }));
  }

  // Parse traits
  const traitRegex = /^\s*(?:pub(?:\([^)]*\))?\s+)?trait\s+(\w+)(?:<[^>]*>)?\s*\{/gm;
  for (const match of matchAll(traitRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = match[0].includes('pub');

    symbols.push(createSymbol(name, 'interface', startLine, filePath, {
      isExported
    }));
  }

  // Parse constants
  const constRegex = /^\s*(?:pub(?:\([^)]*\))?\s+)?const\s+(\w+)\s*:/gm;
  for (const match of matchAll(constRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = match[0].includes('pub');

    symbols.push(createSymbol(name, 'const', startLine, filePath, {
      isExported
    }));
  }

  return { symbols, imports };
};

export default parseRust;
