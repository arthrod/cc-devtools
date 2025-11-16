/**
 * Parse Lisp files (Common Lisp, Scheme, Racket)
 * Extracts: defun, defmacro, defclass, defmethod, defstruct
 */

import { matchAll, getLineNumber, getCapture, createSymbol, createImport } from './types.js';

import type { Parser, SymbolInfo, Import } from './types.js';

const parseLisp : Parser = (filePath, content, _lines) => {
  const symbols: SymbolInfo[] = [];
  const imports: Import[] = [];

  // Parse require/use-package statements
  const importRegex = /\(\s*(?:require|use-package)\s+['"]?([^\s'"]+)/gm;
  for (const match of matchAll(importRegex, content)) {
    const source = getCapture(match, 1);
    imports.push(createImport(source, [source]));
  }

  // Parse defun (functions)
  const defunRegex = /\(\s*defun\s+(\S+)/gm;
  for (const match of matchAll(defunRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse defmacro
  const defmacroRegex = /\(\s*defmacro\s+(\S+)/gm;
  for (const match of matchAll(defmacroRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse defclass
  const defclassRegex = /\(\s*defclass\s+(\S+)/gm;
  for (const match of matchAll(defclassRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'class', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse defmethod
  const defmethodRegex = /\(\s*defmethod\s+(\S+)/gm;
  for (const match of matchAll(defmethodRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse defstruct
  const defstructRegex = /\(\s*defstruct\s+(\S+)/gm;
  for (const match of matchAll(defstructRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'type', startLine, filePath, {
      isExported: true
    }));
  }

  // Parse define (Scheme/Racket functions)
  const defineRegex = /\(\s*define\s+\((\S+)/gm;
  for (const match of matchAll(defineRegex, content)) {
    const name = getCapture(match, 1);
    const startLine = getLineNumber(content, match.index);

    symbols.push(createSymbol(name, 'function', startLine, filePath, {
      isExported: true
    }));
  }

  return { symbols, imports };
};

export default parseLisp;
