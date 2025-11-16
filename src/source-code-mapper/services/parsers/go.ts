/**
 * Parse Go files with enhanced regex patterns
 * Extracts: functions, methods, structs, interfaces, constants
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseGo : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse imports (both single and block imports)
  const importRegex = /import\s+(?:"([^"]+)"|(?:\(([^)]+)\)))/gs;
  for (const match of matchAll(importRegex, content)) {
    if (match[1]) {
      const pkg = match[1].split('/').pop() ?? match[1];
      imports.push(createImport(match[1], [pkg]));
    } else if (match[2]) {
      const importBlock = match[2];
      const importLines = importBlock.split('\n');
      for (const line of importLines) {
        const importMatch = /"([^"]+)"/.exec(line);
        if (importMatch) {
          const pkg = importMatch[1].split('/').pop() ?? importMatch[1];
          imports.push(createImport(importMatch[1], [pkg]));
        }
      }
    }
  }

  // Parse functions and methods
  const functionRegex = /func\s+(?:\(([^)]+)\)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*\()?([^{]*)?/gm;
  for (const match of matchAll(functionRegex, content)) {
    const receiver = getCapture(match, 1);
    const name = getCapture(match, 2);
    const params = getCapture(match, 3);
    const returnType = getCapture(match, 4);
    const startLine = getLineNumber(content, match.index);

    // Go convention: capitalized names are exported
    const isExported = name[0] === name[0].toUpperCase();

    symbols.push(createSymbol(receiver ? `${receiver.trim()}.${name}` : name, 'function', startLine, filePath, {
      isExported,
      signature: `(${params})${returnType ? ` ${returnType.trim()}` : ''}`
    }));
  }

  // Parse type declarations (struct, interface, aliases)
  const typeRegex = /type\s+(\w+)\s+(struct|interface|\w+)/gm;
  for (const match of matchAll(typeRegex, content)) {
    const name = getCapture(match, 1);
    const typeKind = getCapture(match, 2);
    const startLine = getLineNumber(content, match.index);
    const isExported = name[0] === name[0].toUpperCase();

    symbols.push(createSymbol(name, typeKind === 'interface' ? 'interface' : 'type', startLine, filePath, {
      isExported,
      signature: typeKind
    }));
  }

  // Parse constants
  const constRegex = /const\s+(\w+)(?:\s+\w+)?\s*=/gm;
  for (const match of matchAll(constRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);
    const isExported = name[0] === name[0].toUpperCase();

    symbols.push(createSymbol(name, 'const', startLine, filePath, {
      isExported
    }));
  }

  return { symbols, imports };
};

export default parseGo;
