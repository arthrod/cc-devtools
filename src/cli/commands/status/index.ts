import path from 'path';

import { fileExists } from '../../utils/fs-utils.js';
import { readMcpConfig } from '../../utils/mcp-config.js';
import { ensureValidProjectRoot } from '../../utils/validation.js';

const FEATURE_INFO = {
  kanban: {
    name: 'Kanban',
    mcpServerName: 'cc-devtools-kanban',
    dataPath: 'cc-devtools/kanban.yaml',
    description: 'Project management with kanban board',
  },
  memory: {
    name: 'Memory',
    mcpServerName: 'cc-devtools-memory',
    dataPath: 'cc-devtools/memory.yaml',
    description: 'Persistent memory with semantic search',
  },
  planner: {
    name: 'Planner',
    mcpServerName: 'cc-devtools-planner',
    dataPath: 'cc-devtools/planner',
    description: 'Implementation planning and tracking',
  },
  'source-code-mapper': {
    name: 'Source Code Mapper',
    mcpServerName: 'cc-devtools-source-code-mapper',
    dataPath: 'cc-devtools/.cache/source-code-index.msgpack',
    description: 'Semantic code search and mapping',
  },
  clipboard: {
    name: 'Clipboard',
    mcpServerName: 'cc-devtools-clipboard',
    dataPath: '', // No persistent data
    description: 'Copy content to system clipboard',
  },
  workflow: {
    name: 'Workflow',
    mcpServerName: '', // CLI-only, no MCP server
    dataPath: 'cc-devtools/workflow',
    description: 'Automated workflow and code review',
  },
} as const;

interface FeatureStatus {
  name: string;
  enabled: boolean;
  hasData: boolean;
  dataPath: string;
  description: string;
}

/**
 * Check if a feature is enabled in .mcp.json
 */
function isFeatureEnabled(mcpConfig: Record<string, unknown>, serverName: string, projectRoot: string, dataPath: string): boolean {
  // For features without MCP servers (like workflow), check for data directory instead
  if (!serverName) {
    if (!dataPath) {
      return false;
    }
    return hasFeatureData(projectRoot, dataPath);
  }

  const servers = (mcpConfig.mcpServers || {}) as Record<string, { disabled?: boolean }>;
  const server = servers[serverName];

  if (!server) {
    return false;
  }

  return server.disabled !== true;
}

/**
 * Check if feature data exists
 */
function hasFeatureData(projectRoot: string, dataPath: string): boolean {
  const fullPath = path.join(projectRoot, dataPath);
  return fileExists(fullPath);
}

/**
 * Get status for all features
 */
async function getFeatureStatuses(projectRoot: string): Promise<FeatureStatus[]> {
  const mcpConfigPath = path.join(projectRoot, '.mcp.json');
  const mcpConfig = fileExists(mcpConfigPath) ? await readMcpConfig(projectRoot) : {};

  const statuses: FeatureStatus[] = [];

  for (const info of Object.values(FEATURE_INFO)) {
    const enabled = isFeatureEnabled(mcpConfig, info.mcpServerName, projectRoot, info.dataPath);
    const hasData = hasFeatureData(projectRoot, info.dataPath);

    statuses.push({
      name: info.name,
      enabled,
      hasData,
      dataPath: info.dataPath,
      description: info.description,
    });
  }

  return statuses;
}

/**
 * Format feature status for display
 */
function formatFeatureStatus(status: FeatureStatus): string {
  const enabledIcon = status.enabled ? '✓' : '✗';
  const dataIcon = status.hasData ? '📦' : '  ';

  let line = `  ${enabledIcon} ${dataIcon} ${status.name}`;

  if (!status.enabled && !status.hasData) {
    line += ' (not configured)';
  } else if (status.enabled && !status.hasData) {
    line += ' (enabled, no data yet)';
  } else if (!status.enabled && status.hasData) {
    line += ' (disabled, has data)';
  }

  return line;
}

/**
 * Status command - show enabled features and data files
 */
export async function statusCommand(): Promise<void> {
  console.log('📊 cc-devtools status\n');

  // Validate we're in a project root
  ensureValidProjectRoot();

  const projectRoot = process.cwd();

  // Check if package is installed
  const packagePath = path.join(projectRoot, 'node_modules', '@shaenchen', 'cc-devtools');
  const isInstalled = fileExists(packagePath);

  if (!isInstalled) {
    console.log('❌ Package not installed locally');
    console.log('\nPlease install first:');
    console.log('  npm install @shaenchen/cc-devtools\n');
    return;
  }

  console.log('✓ Package installed\n');

  // Get feature statuses
  const statuses = await getFeatureStatuses(projectRoot);
  const enabledCount = statuses.filter(s => s.enabled).length;
  const withDataCount = statuses.filter(s => s.hasData).length;

  // Display summary
  console.log(`Features: ${enabledCount} enabled, ${withDataCount} with data\n`);

  // Display feature list
  console.log('Features:');
  console.log('  ✓ = Enabled in .mcp.json');
  console.log('  📦 = Has data files\n');

  for (const status of statuses) {
    console.log(formatFeatureStatus(status));
  }

  // Show data locations
  console.log('\nData Storage:');
  const dataFeatures = statuses.filter(s => s.hasData);

  if (dataFeatures.length === 0) {
    console.log('  (no data files yet)');
  } else {
    for (const status of dataFeatures) {
      console.log(`  • ${status.name}: ${status.dataPath}`);
    }
  }

  // Show MCP config status
  const mcpConfigPath = path.join(projectRoot, '.mcp.json');
  const hasMcpConfig = fileExists(mcpConfigPath);

  console.log('\nConfiguration:');
  if (hasMcpConfig) {
    console.log('  ✓ .mcp.json configured');
  } else {
    console.log('  ✗ .mcp.json not found');
    console.log('    Run: npx cc-devtools setup');
  }

  // Show gitignore status
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (fileExists(gitignorePath)) {
    const fs = await import('fs/promises');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    const hasCacheExclusion = gitignoreContent.includes('cc-devtools/.cache');

    if (hasCacheExclusion) {
      console.log('  ✓ .gitignore configured (cache excluded)');
    } else {
      console.log('  ⚠ .gitignore missing cache exclusion');
      console.log('    Add: cc-devtools/.cache');
    }
  }

  // Show next steps
  if (enabledCount === 0) {
    console.log('\n💡 Next Steps:');
    console.log('  Run setup to enable features:');
    console.log('    npx cc-devtools setup');
  } else if (enabledCount < 4) {
    console.log('\n💡 Need More Features?');
    console.log('  Enable additional features:');
    console.log('    npx cc-devtools add-feature');
  }

  console.log();
}
