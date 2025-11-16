import path from 'path';

import { fileExists, readTextFile, writeTextFile, appendToFile } from './fs-utils.js';

const GITIGNORE_PATH = '.gitignore';
const CC_DEVTOOLS_CACHE_ENTRY = 'cc-devtools/.cache';

/**
 * Add cc-devtools cache directory to .gitignore
 */
export async function addToGitignore(projectRoot: string = process.cwd()): Promise<boolean> {
  const gitignorePath = path.join(projectRoot, GITIGNORE_PATH);

  // Check if .gitignore exists
  if (!fileExists(gitignorePath)) {
    // Create new .gitignore with our entry
    await writeTextFile(gitignorePath, `# cc-devtools cache\n${CC_DEVTOOLS_CACHE_ENTRY}\n`);
    return true;
  }

  // Read existing .gitignore
  const content = await readTextFile(gitignorePath);
  const lines = content.split('\n');

  // Check if entry already exists
  const entryExists = lines.some(line => line.trim() === CC_DEVTOOLS_CACHE_ENTRY);

  if (entryExists) {
    return false; // Already exists, no changes made
  }

  // Add entry to .gitignore
  const newContent = content.endsWith('\n') ? '' : '\n';
  await appendToFile(gitignorePath, `${newContent}\n# cc-devtools cache\n${CC_DEVTOOLS_CACHE_ENTRY}\n`);
  return true;
}

/**
 * Check if cc-devtools cache is in .gitignore
 */
export async function isInGitignore(projectRoot: string = process.cwd()): Promise<boolean> {
  const gitignorePath = path.join(projectRoot, GITIGNORE_PATH);

  if (!fileExists(gitignorePath)) {
    return false;
  }

  const content = await readTextFile(gitignorePath);
  const lines = content.split('\n');

  return lines.some(line => line.trim() === CC_DEVTOOLS_CACHE_ENTRY);
}
