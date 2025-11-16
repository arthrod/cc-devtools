/**
 * Shared types and utilities for language parsers
 */

import type { SymbolInfo as SymbolInfoType, Import as ImportType, ParseResult, SymbolType } from '../../types.js';

export type { ParseResult };
export type SymbolInfo = SymbolInfoType;
export type Import = ImportType;

/**
 * Parser function signature - each language parser must implement this
 */
export type Parser = (filePath: string, content: string, lines: string[]) => ParseResult;

/**
 * Type-safe regex matching utilities
 */

/**
 * Execute a regex and iterate over all matches with proper null handling
 */
export function* matchAll(regex: RegExp, content: string): Generator<RegExpExecArray, void, unknown> {
  let match;
  while ((match = regex.exec(content)) !== null) {
    yield match;
  }
}

/**
 * Get the line number for a match index in content
 */
export function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

/**
 * Safely get a capture group from a regex match with default value
 */
export function getCapture(match: RegExpExecArray, index: number, defaultValue = ''): string {
  return match[index] ?? defaultValue;
}

/**
 * Create a symbol with proper typing
 */
export function createSymbol(
  name: string,
  type: SymbolType,
  startLine: number,
  file: string,
  options: {
    endLine?: number;
    isExported?: boolean;
    signature?: string;
  } = {}
): SymbolInfo {
  return {
    name,
    type,
    startLine,
    endLine: options.endLine ?? startLine,
    isExported: options.isExported ?? true,
    signature: options.signature,
    file
  };
}

/**
 * Create an import with proper typing
 */
export function createImport(source: string, imported: string[]): Import {
  return {
    source,
    imported,
    usedBy: []
  };
}
