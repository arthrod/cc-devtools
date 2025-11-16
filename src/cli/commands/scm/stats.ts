/**
 * SCM stats command - Show statistics about the indexed codebase
 */

import { existsSync } from 'fs';
import { join } from 'path';

import { loadIndex } from '../../../source-code-mapper/core/storage.js';

/**
 * Stats command handler
 */
export async function statsCommand(): Promise<void> {
  const cwd = process.cwd();
  const indexPath = join(cwd, 'cc-devtools', '.cache', 'source-code-index.msgpack');

  if (!existsSync(indexPath)) {
    console.log('No index found. The index will be created automatically when the MCP server starts.');
    return;
  }

  console.log('Loading index...\n');

  const index = await loadIndex(indexPath);

  if (!index) {
    console.log('Failed to load index or index is corrupted.');
    return;
  }

  console.log('Index Statistics:');
  console.log('=================\n');

  console.log(`Files indexed:     ${index.metadata.fileCount}`);
  console.log(`Symbols found:     ${index.metadata.symbolCount}`);
  console.log(`Indexed at:        ${new Date(index.metadata.indexedAt).toLocaleString()}`);

  const symbolsByType: Record<string, number> = {};
  for (const symbols of index.symbols.values()) {
    for (const symbol of symbols) {
      const currentCount = symbolsByType[symbol.type] ?? 0;
      symbolsByType[symbol.type] = currentCount + 1;
    }
  }

  console.log('\nSymbols by type:');
  for (const [type, count] of Object.entries(symbolsByType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(12)} ${count}`);
  }

  const filesWithMostSymbols = Array.from(index.symbols.entries())
    .map(([file, symbols]) => ({ file, count: symbols.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (filesWithMostSymbols.length > 0) {
    console.log('\nTop 5 files by symbol count:');
    for (const { file, count } of filesWithMostSymbols) {
      const shortPath = file.replace(cwd, '.');
      console.log(`  ${count.toString().padStart(3)}  ${shortPath}`);
    }
  }
}
