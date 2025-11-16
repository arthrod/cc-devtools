import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { addMcpServer, getConfiguredServers } from '../../src/cli/utils/mcp-config.js';
import { addToGitignore, isInGitignore } from '../../src/cli/utils/gitignore.js';
import { ensureDir } from '../../src/cli/utils/fs-utils.js';
import { createTempDir, cleanupTempDir, createMockPackageJson } from '../helpers/test-utils.js';

describe('Setup Command Integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    createMockPackageJson(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Full Setup Flow', () => {
    it('should create cc-devtools directory structure', async () => {
      const ccDevtoolsDir = join(tempDir, 'cc-devtools');
      const cacheDir = join(tempDir, 'cc-devtools', '.cache');

      await ensureDir(ccDevtoolsDir);
      await ensureDir(cacheDir);

      expect(existsSync(ccDevtoolsDir)).toBe(true);
      expect(existsSync(cacheDir)).toBe(true);
    });

    it('should add cc-devtools to .gitignore', async () => {
      const result = await addToGitignore(tempDir);

      expect(result).toBe(true);
      expect(await isInGitignore(tempDir)).toBe(true);

      const gitignorePath = join(tempDir, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf-8');
      expect(content).toContain('cc-devtools/.cache');
      expect(content).toContain('# cc-devtools cache');
    });

    it('should configure MCP server in .mcp.json', async () => {
      await addMcpServer(
        'test-kanban',
        {
          command: 'node',
          args: ['./node_modules/@shaenchen/cc-devtools/dist/kanban/mcp-server/index.js'],
          disabled: false
        },
        tempDir
      );

      const servers = await getConfiguredServers(tempDir);
      expect(servers).toContain('test-kanban');

      const mcpPath = join(tempDir, '.mcp.json');
      expect(existsSync(mcpPath)).toBe(true);

      const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
      expect(content.mcpServers['test-kanban']).toBeDefined();
      expect(content.mcpServers['test-kanban'].command).toBe('node');
    });

    it('should configure multiple MCP servers', async () => {
      const features = [
        { name: 'test-kanban', path: 'dist/kanban/mcp-server/index.js' },
        { name: 'test-memory', path: 'dist/memory/mcp-server/index.js' },
        { name: 'test-planner', path: 'dist/planner/mcp-server/index.js' },
        { name: 'test-mapper', path: 'dist/source-code-mapper/mcp-server/index.js' },
      ];

      for (const feature of features) {
        await addMcpServer(
          feature.name,
          {
            command: 'node',
            args: [`./node_modules/@shaenchen/cc-devtools/${feature.path}`],
            disabled: false
          },
          tempDir
        );
      }

      const servers = await getConfiguredServers(tempDir);
      expect(servers).toHaveLength(4);
      expect(servers).toContain('test-kanban');
      expect(servers).toContain('test-memory');
      expect(servers).toContain('test-planner');
      expect(servers).toContain('test-mapper');
    });

    it('should be idempotent - running setup twice should not duplicate entries', async () => {
      // First setup
      await addToGitignore(tempDir);
      await addMcpServer(
        'test-kanban',
        {
          command: 'node',
          args: ['./dist/kanban/mcp-server/index.js'],
          disabled: false
        },
        tempDir
      );

      // Second setup (simulating re-run)
      const gitignoreResult = await addToGitignore(tempDir);
      expect(gitignoreResult).toBe(false); // Already exists

      await addMcpServer(
        'test-kanban',
        {
          command: 'node',
          args: ['./dist/kanban/mcp-server/index.js'],
          disabled: false
        },
        tempDir
      );

      // Verify no duplicates
      const servers = await getConfiguredServers(tempDir);
      expect(servers.filter(s => s === 'test-kanban')).toHaveLength(1);

      const gitignorePath = join(tempDir, '.gitignore');
      const content = readFileSync(gitignorePath, 'utf-8');
      const matches = content.match(/cc-devtools\/\.cache/g);
      expect(matches).toHaveLength(1);
    });

    it('should create correct directory paths for each tool', async () => {
      const directories = [
        'cc-devtools',
        'cc-devtools/.cache',
        'cc-devtools/kanban',
        'cc-devtools/memory',
        'cc-devtools/planner',
      ];

      for (const dir of directories) {
        await ensureDir(join(tempDir, dir));
      }

      for (const dir of directories) {
        expect(existsSync(join(tempDir, dir))).toBe(true);
      }
    });
  });
});
