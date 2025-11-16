/**
 * Parse C/C++ files
 * Extracts: functions, classes, structs, enums, typedefs
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseCCpp : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse includes
  const importRegex = /^\s*#include\s+[<"]([^>"]+)[>"]/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    imports.push(createImport(source, [source.split('/').pop()?.replace(/\.h$/, '') ?? source]));
  }

  // Parse classes
  const classRegex = /^\s*(?:template\s*<[^>]*>\s*)?class\s+(\w+)(?:\s*:\s*(?:public|private|protected)\s+[\w<>:,]+)?\s*\{/gm;
  for (const match of matchAll(classRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse structs
  const structRegex = /^\s*(?:typedef\s+)?struct\s+(\w+)\s*\{/gm;
  for (const match of matchAll(structRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'type', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse enums
  const enumRegex = /^\s*enum(?:\s+class)?\s+(\w+)\s*\{/gm;
  for (const match of matchAll(enumRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'enum', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse functions
  const functionRegex = /^\s*(?:static\s+)?(?:inline\s+)?(?:virtual\s+)?(?:\w+(?:<[^>]*>)?[*&]?\s+)+(\w+)\s*\(([^)]*)\)(?:\s+const)?\s*\{/gm;
  for (const match of matchAll(functionRegex, content)) {
    const name = getCapture(match, 1);
    const params = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true,
      signature: `(${params})`
    }));
  }

  return { symbols, imports };
};

export default parseCCpp;
