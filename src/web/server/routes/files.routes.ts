/**
 * File browser API endpoints for code editor functionality.
 *
 * Provides secure file system operations with:
 * - Directory traversal prevention
 * - Project root restriction
 * - File size limits
 * - Path validation
 */

import { promises as fs } from 'fs';
import path from 'path';

import { Router, type Request, type Response } from 'express';

import * as logger from '../utils/logger.js';

import type { WebConfig, FileTreeNode, FileContent, FileContentRequest } from '../../shared/types.js';

/**
 * Language detection map based on file extensions
 */
const LANGUAGE_MAP: Record<string, string> = {
  // Tier 1
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.java': 'java',
  '.cs': 'csharp',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.swift': 'swift',
  // Tier 2
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.scala': 'scala',
  '.dart': 'dart',
  '.r': 'r',
  '.R': 'r',
  '.m': 'objective-c',
  '.mm': 'objective-c',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.pl': 'perl',
  '.lua': 'lua',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.clj': 'clojure',
  '.cljs': 'clojure',
  // Essential formats
  '.json': 'json',
  '.md': 'markdown',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.xml': 'xml',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql',
};

/**
 * Detects programming language from file path
 */
function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] ?? 'plaintext';
}

/**
 * Validates that path is safe and within project root
 * Prevents directory traversal attacks
 */
function validatePath(requestedPath: string, projectRoot: string): string {
  // Resolve the absolute path
  const absolutePath = path.resolve(projectRoot, requestedPath);

  // Ensure it's within project root
  if (!absolutePath.startsWith(projectRoot)) {
    throw new Error('Access denied: Path outside project root');
  }

  // Check for directory traversal patterns
  if (requestedPath.includes('..') || requestedPath.includes('~')) {
    throw new Error('Invalid path: Directory traversal not allowed');
  }

  return absolutePath;
}

/**
 * Check if file should be ignored (common patterns)
 */
function shouldIgnore(name: string): boolean {
  const ignorePatterns = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    '.cache',
    'coverage',
    '.DS_Store',
    'Thumbs.db',
  ];

  return ignorePatterns.includes(name) || name.startsWith('.');
}

/**
 * Recursively build file tree
 */
async function buildFileTree(
  dirPath: string,
  relativePath: string,
  maxDepth: number = 3,
  currentDepth: number = 0
): Promise<FileTreeNode> {
  const stats = await fs.stat(dirPath);
  const name = path.basename(dirPath);

  const node: FileTreeNode = {
    name,
    path: relativePath || '.',
    type: stats.isDirectory() ? 'directory' : 'file',
  };

  if (stats.isFile()) {
    node.size = stats.size;
    return node;
  }

  // Don't recurse beyond max depth
  if (currentDepth >= maxDepth) {
    return node;
  }

  // Read directory contents
  try {
    const entries = await fs.readdir(dirPath);
    const children: FileTreeNode[] = [];

    for (const entry of entries) {
      // Skip ignored files/directories
      if (shouldIgnore(entry)) {
        continue;
      }

      const entryPath = path.join(dirPath, entry);
      const entryRelPath = relativePath ? path.join(relativePath, entry) : entry;

      try {
        const childNode = await buildFileTree(entryPath, entryRelPath, maxDepth, currentDepth + 1);
        children.push(childNode);
      } catch (error) {
        // Skip files/dirs that can't be read
        logger.debug(`Skipping ${entry}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Sort: directories first, then alphabetically
    children.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    node.children = children;
  } catch (error) {
    logger.warn(`Failed to read directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return node;
}

/**
 * Handle async route errors
 */
function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: (err: unknown) => void): void => {
    Promise.resolve(fn(req, res)).catch(next);
  };
}

/**
 * Creates Express router with file API endpoints
 */
export function createFilesRouter(config: WebConfig): Router {
  const router = Router();
  const projectRoot = process.cwd();
  const maxFileSize = config.editor?.maxFileSize ?? 10 * 1024 * 1024; // 10MB default

  /**
   * GET /api/files?path=<path>
   * List files in directory (returns file tree)
   */
  router.get('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const requestedPath = (req.query['path'] as string) ?? '.';

      logger.debug(`Listing files at path: ${requestedPath}`);

      // Validate path
      const absolutePath = validatePath(requestedPath, projectRoot);

      // Check if path exists
      try {
        await fs.access(absolutePath);
      } catch {
        res.status(404).json({
          error: {
            message: 'Path not found',
            code: 'NOT_FOUND',
          },
        });
        return;
      }

      // Build file tree
      const tree = await buildFileTree(absolutePath, requestedPath);

      res.json({ data: tree });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to list files: ${errorMessage}`);

      res.status(500).json({
        error: {
          message: errorMessage,
          code: 'SERVER_ERROR',
        },
      });
    }
  }));

  /**
   * GET /api/files/content?path=<path>
   * Read file contents
   */
  router.get('/content', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const requestedPath = req.query['path'] as string;

      if (!requestedPath) {
        res.status(400).json({
          error: {
            message: 'Path parameter is required',
            code: 'INVALID_REQUEST',
          },
        });
        return;
      }

      logger.debug(`Reading file: ${requestedPath}`);

      // Validate path
      const absolutePath = validatePath(requestedPath, projectRoot);

      // Check file exists
      let stats;
      try {
        stats = await fs.stat(absolutePath);
      } catch {
        res.status(404).json({
          error: {
            message: 'File not found',
            code: 'NOT_FOUND',
          },
        });
        return;
      }

      // Check it's a file (not directory)
      if (!stats.isFile()) {
        res.status(400).json({
          error: {
            message: 'Path is not a file',
            code: 'INVALID_REQUEST',
          },
        });
        return;
      }

      // Check file size
      if (stats.size > maxFileSize) {
        res.status(413).json({
          error: {
            message: `File too large (max ${maxFileSize} bytes)`,
            code: 'FILE_TOO_LARGE',
          },
        });
        return;
      }

      // Read file content
      const content = await fs.readFile(absolutePath, 'utf-8');
      const language = detectLanguage(requestedPath);

      const response: FileContent = {
        path: requestedPath,
        content,
        language,
        size: stats.size,
      };

      res.json({ data: response });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to read file: ${errorMessage}`);

      res.status(500).json({
        error: {
          message: errorMessage,
          code: 'SERVER_ERROR',
        },
      });
    }
  }));

  /**
   * POST /api/files/content
   * Write file contents
   * Body: { path: string, content: string }
   */
  router.post('/content', asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as unknown;

      // Validate request body
      if (!body || typeof body !== 'object') {
        res.status(400).json({
          error: {
            message: 'Invalid request body',
            code: 'INVALID_REQUEST',
          },
        });
        return;
      }

      const { path: requestedPath, content } = body as FileContentRequest;

      if (!requestedPath || typeof requestedPath !== 'string') {
        res.status(400).json({
          error: {
            message: 'Path is required',
            code: 'INVALID_REQUEST',
          },
        });
        return;
      }

      if (typeof content !== 'string') {
        res.status(400).json({
          error: {
            message: 'Content must be a string',
            code: 'INVALID_REQUEST',
          },
        });
        return;
      }

      logger.debug(`Writing file: ${requestedPath}`);

      // Validate path
      const absolutePath = validatePath(requestedPath, projectRoot);

      // Check content size
      const contentSize = Buffer.byteLength(content, 'utf-8');
      if (contentSize > maxFileSize) {
        res.status(413).json({
          error: {
            message: `Content too large (max ${maxFileSize} bytes)`,
            code: 'CONTENT_TOO_LARGE',
          },
        });
        return;
      }

      // Ensure parent directory exists
      const dirPath = path.dirname(absolutePath);
      await fs.mkdir(dirPath, { recursive: true });

      // Write file
      await fs.writeFile(absolutePath, content, 'utf-8');

      logger.info(`File written successfully: ${requestedPath}`);

      res.json({
        success: true,
        data: {
          path: requestedPath,
          size: contentSize,
        },
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to write file: ${errorMessage}`);

      res.status(500).json({
        error: {
          message: errorMessage,
          code: 'SERVER_ERROR',
        },
      });
    }
  }));

  return router;
}
