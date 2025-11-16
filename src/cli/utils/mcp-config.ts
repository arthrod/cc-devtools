import path from 'path';

import { fileExists, readJsonFile, writeJsonFile } from './fs-utils.js';

interface McpServerConfig {
  command: string;
  args: string[];
  disabled?: boolean;
  env?: Record<string, string>;
}

interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

const MCP_CONFIG_PATH = '.mcp.json';

/**
 * Read the .mcp.json configuration file
 */
export async function readMcpConfig(projectRoot: string = process.cwd()): Promise<McpConfig> {
  const configPath = path.join(projectRoot, MCP_CONFIG_PATH);

  if (!fileExists(configPath)) {
    return { mcpServers: {} };
  }

  return readJsonFile<McpConfig>(configPath);
}

/**
 * Write the .mcp.json configuration file
 */
export async function writeMcpConfig(config: McpConfig, projectRoot: string = process.cwd()): Promise<void> {
  const configPath = path.join(projectRoot, MCP_CONFIG_PATH);
  await writeJsonFile(configPath, config);
}

/**
 * Add or update an MCP server entry
 */
export async function addMcpServer(
  serverName: string,
  serverConfig: McpServerConfig,
  projectRoot: string = process.cwd()
): Promise<void> {
  const config = await readMcpConfig(projectRoot);
  config.mcpServers[serverName] = serverConfig;
  await writeMcpConfig(config, projectRoot);
}

/**
 * Remove an MCP server entry
 */
export async function removeMcpServer(serverName: string, projectRoot: string = process.cwd()): Promise<void> {
  const config = await readMcpConfig(projectRoot);
  delete config.mcpServers[serverName];
  await writeMcpConfig(config, projectRoot);
}

/**
 * Check if an MCP server is configured
 */
export async function isMcpServerConfigured(serverName: string, projectRoot: string = process.cwd()): Promise<boolean> {
  const config = await readMcpConfig(projectRoot);
  return serverName in config.mcpServers;
}

/**
 * Get all configured MCP server names
 */
export async function getConfiguredServers(projectRoot: string = process.cwd()): Promise<string[]> {
  const config = await readMcpConfig(projectRoot);
  return Object.keys(config.mcpServers);
}
