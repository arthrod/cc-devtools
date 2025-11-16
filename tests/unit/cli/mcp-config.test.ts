import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import {
  readMcpConfig,
  writeMcpConfig,
  addMcpServer,
  removeMcpServer,
  isMcpServerConfigured,
  getConfiguredServers,
} from '../../../src/cli/utils/mcp-config.js';
import { createTempDir, cleanupTempDir, createMockMcpJson, readJsonFile } from '../../helpers/test-utils.js';

describe('mcp-config', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('readMcpConfig', () => {
    it('should return empty config if file does not exist', async () => {
      const config = await readMcpConfig(tempDir);

      expect(config).toEqual({ mcpServers: {} });
    });

    it('should read existing .mcp.json file', async () => {
      const mockConfig = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['server.js']
          }
        }
      };
      createMockMcpJson(tempDir, mockConfig);

      const config = await readMcpConfig(tempDir);

      expect(config).toEqual(mockConfig);
    });
  });

  describe('writeMcpConfig', () => {
    it('should write config to .mcp.json', async () => {
      const mockConfig = {
        mcpServers: {
          'test-server': {
            command: 'node',
            args: ['server.js'],
            disabled: false
          }
        }
      };

      await writeMcpConfig(mockConfig, tempDir);

      const mcpPath = join(tempDir, '.mcp.json');
      const written = readJsonFile(mcpPath);
      expect(written).toEqual(mockConfig);
    });
  });

  describe('addMcpServer', () => {
    it('should add a new server to empty config', async () => {
      await addMcpServer(
        'kanban',
        {
          command: 'node',
          args: ['dist/kanban/mcp-server/index.js']
        },
        tempDir
      );

      const config = await readMcpConfig(tempDir);
      expect(config.mcpServers).toHaveProperty('kanban');
      expect(config.mcpServers.kanban.command).toBe('node');
    });

    it('should add server to existing config', async () => {
      createMockMcpJson(tempDir, {
        mcpServers: {
          'existing': {
            command: 'node',
            args: ['existing.js']
          }
        }
      });

      await addMcpServer(
        'new-server',
        {
          command: 'node',
          args: ['new.js']
        },
        tempDir
      );

      const config = await readMcpConfig(tempDir);
      expect(config.mcpServers).toHaveProperty('existing');
      expect(config.mcpServers).toHaveProperty('new-server');
    });

    it('should overwrite existing server with same name', async () => {
      createMockMcpJson(tempDir, {
        mcpServers: {
          'test': {
            command: 'node',
            args: ['old.js']
          }
        }
      });

      await addMcpServer(
        'test',
        {
          command: 'node',
          args: ['new.js']
        },
        tempDir
      );

      const config = await readMcpConfig(tempDir);
      expect(config.mcpServers.test.args).toEqual(['new.js']);
    });
  });

  describe('removeMcpServer', () => {
    it('should remove an existing server', async () => {
      createMockMcpJson(tempDir, {
        mcpServers: {
          'server1': { command: 'node', args: ['s1.js'] },
          'server2': { command: 'node', args: ['s2.js'] }
        }
      });

      await removeMcpServer('server1', tempDir);

      const config = await readMcpConfig(tempDir);
      expect(config.mcpServers).not.toHaveProperty('server1');
      expect(config.mcpServers).toHaveProperty('server2');
    });

    it('should handle removing non-existent server gracefully', async () => {
      createMockMcpJson(tempDir, {
        mcpServers: {
          'existing': { command: 'node', args: ['s.js'] }
        }
      });

      await removeMcpServer('non-existent', tempDir);

      const config = await readMcpConfig(tempDir);
      expect(config.mcpServers).toHaveProperty('existing');
    });
  });

  describe('isMcpServerConfigured', () => {
    it('should return true if server is configured', async () => {
      createMockMcpJson(tempDir, {
        mcpServers: {
          'test': { command: 'node', args: ['test.js'] }
        }
      });

      const result = await isMcpServerConfigured('test', tempDir);

      expect(result).toBe(true);
    });

    it('should return false if server is not configured', async () => {
      createMockMcpJson(tempDir, {
        mcpServers: {}
      });

      const result = await isMcpServerConfigured('non-existent', tempDir);

      expect(result).toBe(false);
    });

    it('should return false if config file does not exist', async () => {
      const result = await isMcpServerConfigured('test', tempDir);

      expect(result).toBe(false);
    });
  });

  describe('getConfiguredServers', () => {
    it('should return array of configured server names', async () => {
      createMockMcpJson(tempDir, {
        mcpServers: {
          'kanban': { command: 'node', args: ['k.js'] },
          'memory': { command: 'node', args: ['m.js'] },
          'planner': { command: 'node', args: ['p.js'] }
        }
      });

      const servers = await getConfiguredServers(tempDir);

      expect(servers).toHaveLength(3);
      expect(servers).toContain('kanban');
      expect(servers).toContain('memory');
      expect(servers).toContain('planner');
    });

    it('should return empty array if no servers configured', async () => {
      createMockMcpJson(tempDir, {
        mcpServers: {}
      });

      const servers = await getConfiguredServers(tempDir);

      expect(servers).toEqual([]);
    });

    it('should return empty array if config file does not exist', async () => {
      const servers = await getConfiguredServers(tempDir);

      expect(servers).toEqual([]);
    });
  });
});
