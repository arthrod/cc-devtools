/**
 * Parse COBOL files
 * Extracts: programs, procedures, sections, paragraphs
 */

import { matchAll, getLineNumber, getCapture, createSymbol } from './types.js';

import type { Parser, SymbolInfo } from './types.js';

const parseCobol : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];

  // Parse program-id
  const programRegex = /^\s*program-id\.\s+(\w+)/gim;
  for (const match of matchAll(programRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse sections
  const sectionRegex = /^\s*(\w+)\s+section\./gim;
  for (const match of matchAll(sectionRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse paragraphs (procedure divisions)
  const paragraphRegex = /^\s*(\w+(?:-\w+)*)\.\s*$/gim;
  for (const match of matchAll(paragraphRegex, content)) {
    const name = getCapture(match, 1);
    // Skip common COBOL keywords
    if (name.toLowerCase().match(/^(identification|environment|data|procedure|working-storage|file|input-output)$/)) {
      continue;
    }
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  return { symbols, imports: [] };
};

export default parseCobol;
