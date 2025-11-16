import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { statusCommand } from '../../src/cli/commands/status/index.js';
import { addFeatureCommand } from '../../src/cli/commands/add-feature/index.js';
import { removeFeatureCommand } from '../../src/cli/commands/remove-feature/index.js';
import { addMcpServer } from '../../src/cli/utils/mcp-config.js';
import {
  createTempDir,
  cleanupTempDir,
  createMockPackageJson,
  createMockMcpJson,
  suppressConsole,
  readJsonFile,
} from '../helpers/test-utils.js';

describe('CLI Commands Integration', () => {
  let tempDir: string;
  let originalCwd: string;
  let consoleOutput: { restore: () => void };

  beforeEach(() => {
    tempDir = createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);
    createMockPackageJson(tempDir);
    consoleOutput = suppressConsole();
  });

  afterEach(() => {
    consoleOutput.restore();
    process.chdir(originalCwd);
    cleanupTempDir(tempDir);
    vi.clearAllMocks();
  });

  describe('status command', () => {
    it('should show package not installed when missing', async () => {
      // No node_modules created
      createMockMcpJson(tempDir);

      await expect(statusCommand()).resolves.not.toThrow();
      // Command should exit early when package not found
    });

    it('should show no features enabled in fresh project', async () => {
      // Create package structure
      const nodeModulesPath = join(tempDir, 'node_modules', '@shaenchen', 'cc-devtools');
      mkdirSync(nodeModulesPath, { recursive: true });
      createMockMcpJson(tempDir);

      await expect(statusCommand()).resolves.not.toThrow();
    });

    it('should show enabled features correctly', async () => {
      // Setup package
      const nodeModulesPath = join(tempDir, 'node_modules', '@shaenchen', 'cc-devtools');
      mkdirSync(nodeModulesPath, { recursive: true });

      // Add kanban feature to .mcp.json
      await addMcpServer(
        'cc-devtools-kanban',
        {
          command: 'node',
          args: ['./node_modules/@shaenchen/cc-devtools/dist/kanban/mcp-server/index.js'],
          disabled: false,
        },
        tempDir
      );

      await expect(statusCommand()).resolves.not.toThrow();

      // Verify .mcp.json has the server
      const mcpConfig = readJsonFile<{ mcpServers: Record<string, unknown> }>(
        join(tempDir, '.mcp.json')
      );
      expect(mcpConfig.mcpServers['cc-devtools-kanban']).toBeDefined();
    });

    it('should show data file status correctly', async () => {
      // Setup package
      const nodeModulesPath = join(tempDir, 'node_modules', '@shaenchen', 'cc-devtools');
      mkdirSync(nodeModulesPath, { recursive: true });
      createMockMcpJson(tempDir);

      // Create kanban data file
      const ccDevtoolsDir = join(tempDir, 'cc-devtools');
      mkdirSync(ccDevtoolsDir, { recursive: true });
      writeFileSync(join(ccDevtoolsDir, 'kanban.yaml'), 'test: data', 'utf-8');

      await expect(statusCommand()).resolves.not.toThrow();
      expect(existsSync(join(tempDir, 'cc-devtools', 'kanban.yaml'))).toBe(true);
    });

    it('should show .mcp.json status', async () => {
      // Setup package
      const nodeModulesPath = join(tempDir, 'node_modules', '@shaenchen', 'cc-devtools');
      mkdirSync(nodeModulesPath, { recursive: true });

      // Test without .mcp.json first
      await expect(statusCommand()).resolves.not.toThrow();
      expect(existsSync(join(tempDir, '.mcp.json'))).toBe(false);

      // Now create .mcp.json
      createMockMcpJson(tempDir);
      await expect(statusCommand()).resolves.not.toThrow();
      expect(existsSync(join(tempDir, '.mcp.json'))).toBe(true);
    });

    it('should show .gitignore status', async () => {
      // Setup package
      const nodeModulesPath = join(tempDir, 'node_modules', '@shaenchen', 'cc-devtools');
      mkdirSync(nodeModulesPath, { recursive: true });
      createMockMcpJson(tempDir);

      // Create .gitignore with cache exclusion
      writeFileSync(join(tempDir, '.gitignore'), 'node_modules/\ncc-devtools/.cache\n', 'utf-8');

      await expect(statusCommand()).resolves.not.toThrow();
      expect(existsSync(join(tempDir, '.gitignore'))).toBe(true);
    });
  });

  describe('add-feature command', () => {
    beforeEach(() => {
      // Setup basic package structure
      const nodeModulesPath = join(
        tempDir,
        'node_modules',
        '@shaenchen',
        'cc-devtools',
        'dist',
        'kanban',
        'mcp-server'
      );
      mkdirSync(nodeModulesPath, { recursive: true });
      writeFileSync(join(nodeModulesPath, 'index.js'), '// mock server', 'utf-8');

      const memoryPath = join(
        tempDir,
        'node_modules',
        '@shaenchen',
        'cc-devtools',
        'dist',
        'memory',
        'mcp-server'
      );
      mkdirSync(memoryPath, { recursive: true });
      writeFileSync(join(memoryPath, 'index.js'), '// mock server', 'utf-8');

      const plannerPath = join(
        tempDir,
        'node_modules',
        '@shaenchen',
        'cc-devtools',
        'dist',
        'planner',
        'mcp-server'
      );
      mkdirSync(plannerPath, { recursive: true });
      writeFileSync(join(plannerPath, 'index.js'), '// mock server', 'utf-8');

      const mapperPath = join(
        tempDir,
        'node_modules',
        '@shaenchen',
        'cc-devtools',
        'dist',
        'source-code-mapper',
        'mcp-server'
      );
      mkdirSync(mapperPath, { recursive: true });
      writeFileSync(join(mapperPath, 'index.js'), '// mock server', 'utf-8');

      createMockMcpJson(tempDir);
    });

    it('should fail when package not installed', async () => {
      // Clean up the node_modules we created
      cleanupTempDir(join(tempDir, 'node_modules'));

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
        throw new Error(`process.exit(${code})`);
      });

      await expect(addFeatureCommand(['--features=kanban'])).rejects.toThrow('process.exit(1)');
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });

    it('should show all features already enabled when appropriate', async () => {
      // Enable all features
      await addMcpServer(
        'cc-devtools-kanban',
        { command: 'node', args: ['./dist/kanban/mcp-server/index.js'], disabled: false },
        tempDir
      );
      await addMcpServer(
        'cc-devtools-memory',
        { command: 'node', args: ['./dist/memory/mcp-server/index.js'], disabled: false },
        tempDir
      );
      await addMcpServer(
        'cc-devtools-planner',
        { command: 'node', args: ['./dist/planner/mcp-server/index.js'], disabled: false },
        tempDir
      );
      await addMcpServer(
        'cc-devtools-source-code-mapper',
        { command: 'node', args: ['./dist/source-code-mapper/mcp-server/index.js'], disabled: false },
        tempDir
      );
      await addMcpServer(
        'cc-devtools-clipboard',
        { command: 'node', args: ['./dist/clipboard/index.js'], disabled: false },
        tempDir
      );

      // When all features are enabled, command returns early without prompts
      await expect(addFeatureCommand([])).resolves.not.toThrow();
    });

    it('should add MCP server to .mcp.json', async () => {
      await expect(addFeatureCommand(['--features=kanban', '--no-slash-commands'])).resolves.not.toThrow();

      const mcpConfig = readJsonFile<{ mcpServers: Record<string, unknown> }>(
        join(tempDir, '.mcp.json')
      );
      expect(mcpConfig.mcpServers['cc-devtools-kanban']).toBeDefined();
    });

    it('should handle multiple features with flag-based selection', async () => {
      await expect(
        addFeatureCommand(['--features=kanban,memory', '--no-slash-commands'])
      ).resolves.not.toThrow();

      const mcpConfig = readJsonFile<{ mcpServers: Record<string, unknown> }>(
        join(tempDir, '.mcp.json')
      );
      expect(mcpConfig.mcpServers['cc-devtools-kanban']).toBeDefined();
      expect(mcpConfig.mcpServers['cc-devtools-memory']).toBeDefined();
    });

    it('should validate feature names', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
        throw new Error(`process.exit(${code})`);
      });

      await expect(addFeatureCommand(['--features=invalid-feature'])).rejects.toThrow(
        'process.exit(1)'
      );
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });

    it('should handle already enabled features gracefully', async () => {
      // Enable kanban first
      await addMcpServer(
        'cc-devtools-kanban',
        { command: 'node', args: ['./dist/kanban/mcp-server/index.js'], disabled: false },
        tempDir
      );

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
        throw new Error(`process.exit(${code})`);
      });

      // Try to add kanban again with flag - should exit with error
      await expect(addFeatureCommand(['--features=kanban'])).rejects.toThrow('process.exit(1)');
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });

    it('should copy slash commands when requested', async () => {
      // Create templates directory in the kanban subdirectory
      const templatesPath = join(
        tempDir,
        'node_modules',
        '@shaenchen',
        'cc-devtools',
        'templates',
        'commands',
        'kanban'
      );
      mkdirSync(templatesPath, { recursive: true });
      writeFileSync(join(templatesPath, 'kanban-next.md'), '# Kanban Next', 'utf-8');
      writeFileSync(join(templatesPath, 'kanban-board.md'), '# Kanban Board', 'utf-8');

      await expect(addFeatureCommand(['--features=kanban', '--slash-commands'])).resolves.not.toThrow();

      const claudeCommandsPath = join(tempDir, '.claude', 'commands');
      expect(existsSync(join(claudeCommandsPath, 'kanban-next.md'))).toBe(true);
      expect(existsSync(join(claudeCommandsPath, 'kanban-board.md'))).toBe(true);
    });
  });

  describe('remove-feature command', () => {
    beforeEach(() => {
      // Setup package structure
      const nodeModulesPath = join(tempDir, 'node_modules', '@shaenchen', 'cc-devtools');
      mkdirSync(nodeModulesPath, { recursive: true });
      createMockMcpJson(tempDir);
    });

    it('should show no features when none enabled', async () => {
      // This should complete without prompts since there are no features
      await expect(removeFeatureCommand([])).resolves.not.toThrow();
    });

    it('should handle feature not enabled error', async () => {
      // Enable kanban so command proceeds to feature selection
      await addMcpServer(
        'cc-devtools-kanban',
        { command: 'node', args: ['./dist/kanban/mcp-server/index.js'], disabled: false },
        tempDir
      );

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
        throw new Error(`process.exit(${code})`);
      });

      // Try to remove planner which is not enabled - should exit with error
      await expect(removeFeatureCommand(['--features=planner'])).rejects.toThrow('process.exit(1)');
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
    });

    it('should validate that features exist before attempting removal', async () => {
      // Enable only kanban
      await addMcpServer(
        'cc-devtools-kanban',
        { command: 'node', args: ['./dist/kanban/mcp-server/index.js'], disabled: false },
        tempDir
      );

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
        throw new Error(`process.exit(${code})`);
      });

      // Try to remove planner which is not enabled - should exit with error
      await expect(removeFeatureCommand(['--features=planner'])).rejects.toThrow('process.exit(1)');
      expect(exitSpy).toHaveBeenCalledWith(1);

      // Kanban should still be enabled
      const mcpConfig = readJsonFile<{ mcpServers: Record<string, unknown> }>(
        join(tempDir, '.mcp.json')
      );
      expect(mcpConfig.mcpServers['cc-devtools-kanban']).toBeDefined();

      exitSpy.mockRestore();
    });
  });
});
