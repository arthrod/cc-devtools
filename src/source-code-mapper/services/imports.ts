/**
 * Import graph queries
 * Find imports for files and which files import specific modules
 */

import type { Index, FileImports } from '../types.js';

export function getFileImports(index: Index, filepath: string): FileImports | null {
  const imports = index.imports.get(filepath);

  if (!imports) {
    return null;
  }

  return {
    file: filepath,
    imports
  };
}

export function findImporters(index: Index, importedModule: string): FileImports[] {
  const results: FileImports[] = [];

  for (const [file, imports] of index.imports.entries()) {
    const matchingImports = imports.filter(imp =>
      imp.source === importedModule ||
      imp.source.endsWith(`/${importedModule}`) ||
      imp.source.endsWith(`/${importedModule}.js`) ||
      imp.source.endsWith(`/${importedModule}.ts`)
    );

    if (matchingImports.length > 0) {
      results.push({
        file,
        imports: matchingImports
      });
    }
  }

  return results;
}

export function getFunctionImportUsage(
  index: Index,
  filepath: string,
  functionName: string
): FileImports | null {
  const imports = index.imports.get(filepath);

  if (!imports) {
    return null;
  }

  const relevantImports = imports.filter(imp =>
    imp.usedBy.includes(functionName)
  );

  if (relevantImports.length === 0) {
    return null;
  }

  return {
    file: filepath,
    imports: relevantImports
  };
}
