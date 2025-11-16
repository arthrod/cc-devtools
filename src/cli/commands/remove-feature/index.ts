import path from 'path';

import { fileExists } from '../../utils/fs-utils.js';
import { removeMcpServer, readMcpConfig } from '../../utils/mcp-config.js';
import { confirm, multiSelect } from '../../utils/prompts.js';
import { ensureValidProjectRoot, validateFeatures } from '../../utils/validation.js';

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

type FeatureName = keyof typeof FEATURE_INFO;

interface RemoveFeatureOptions {
  features?: string[];
  keepData?: boolean;
}

/**
 * Parse command-line flags
 */
function parseRemoveFeatureArgs(args: string[]): RemoveFeatureOptions {
  const options: RemoveFeatureOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--features=')) {
      const featuresStr = arg.split('=')[1];
      options.features = featuresStr.split(',').map(f => f.trim());
    } else if (arg === '--keep-data') {
      options.keepData = true;
    } else if (arg === '--remove-data') {
      options.keepData = false;
    }
  }

  return options;
}

/**
 * Check if feature is enabled
 */
function isFeatureEnabled(mcpConfig: Record<string, unknown>, serverName: string): boolean {
  const servers = (mcpConfig.mcpServers || {}) as Record<string, { disabled?: boolean }>;
  const server = servers[serverName];

  if (!server) {
    return false;
  }

  return server.disabled !== true;
}

/**
 * Check if feature has data
 */
function hasFeatureData(projectRoot: string, dataPath: string): boolean {
  const fullPath = path.join(projectRoot, dataPath);
  return fileExists(fullPath);
}

/**
 * Get features that are currently enabled
 */
async function getEnabledFeatures(projectRoot: string): Promise<string[]> {
  const mcpConfigPath = path.join(projectRoot, '.mcp.json');
  const mcpConfig = fileExists(mcpConfigPath) ? await readMcpConfig(projectRoot) : {};

  const enabled: string[] = [];

  for (const [featureKey, info] of Object.entries(FEATURE_INFO)) {
    if (isFeatureEnabled(mcpConfig, info.mcpServerName)) {
      enabled.push(featureKey);
    }
  }

  return enabled;
}

/**
 * Get feature selection (from flags or interactive prompt)
 */
async function getFeatureSelection(
  providedFeatures: string[] | undefined,
  enabledFeatures: string[]
): Promise<string[]> {
  if (providedFeatures) {
    const { valid, invalid, suggestions } = validateFeatures(providedFeatures);

    if (invalid.length > 0) {
      console.error(`Error: Invalid features: ${invalid.join(', ')}`);

      for (const invalidFeature of invalid) {
        const suggestion = suggestions[invalidFeature];
        if (suggestion) {
          console.error(`  Did you mean '${suggestion}' instead of '${invalidFeature}'?`);
        }
      }

      console.error('\nValid features: kanban, memory, planner, source-code-mapper, clipboard, workflow');
      process.exit(1);
    }

    // Filter to only enabled features
    const notEnabled = valid.filter(f => !enabledFeatures.includes(f));
    if (notEnabled.length > 0) {
      console.error(`Error: Features not enabled: ${notEnabled.join(', ')}`);
      process.exit(1);
    }

    return valid;
  }

  // Interactive selection
  const choices = enabledFeatures.map(key => {
    const info = FEATURE_INFO[key as FeatureName];
    return {
      name: info.name,
      value: key,
      description: info.description,
    };
  });

  if (choices.length === 0) {
    return [];
  }

  return multiSelect('Which features would you like to remove?', choices, []);
}

/**
 * Remove MCP server for a feature
 */
async function removeMcpServerForFeature(feature: string, projectRoot: string): Promise<void> {
  const info = FEATURE_INFO[feature as FeatureName];

  // Skip MCP server removal for workflow (it's CLI-only, no MCP server)
  if (feature === 'workflow') {
    console.log(`  ℹ No MCP server for ${info.name} (CLI-only feature)`);
    return;
  }

  await removeMcpServer(info.mcpServerName, projectRoot);

  console.log(`  ✓ Removed MCP server: ${info.mcpServerName}`);
}

/**
 * Remove feature data
 */
async function removeFeatureData(feature: string, projectRoot: string): Promise<void> {
  const info = FEATURE_INFO[feature as FeatureName];
  const dataPath = path.join(projectRoot, info.dataPath);

  if (!fileExists(dataPath)) {
    console.log(`  ℹ No data to remove for ${info.name}`);
    return;
  }

  const fs = await import('fs/promises');
  const stat = await fs.stat(dataPath);

  if (stat.isDirectory()) {
    await fs.rm(dataPath, { recursive: true, force: true });
    console.log(`  ✓ Removed directory: ${info.dataPath}`);
  } else {
    await fs.unlink(dataPath);
    console.log(`  ✓ Removed file: ${info.dataPath}`);
  }
}

/**
 * Remove slash commands for a feature
 */
async function removeSlashCommands(feature: string, projectRoot: string): Promise<void> {
  const commandsDir = path.join(projectRoot, '.claude', 'commands');

  if (!fileExists(commandsDir)) {
    return;
  }

  // Get list of expected slash command files for this feature
  const packageRoot = path.join(projectRoot, 'node_modules', '@shaenchen', 'cc-devtools');
  const featureTemplatesDir = path.join(packageRoot, 'templates', 'commands', feature);

  if (!fileExists(featureTemplatesDir)) {
    return;
  }

  const fs = await import('fs/promises');
  const templateFiles = await fs.readdir(featureTemplatesDir);
  const commandFiles = templateFiles.filter(f => f.endsWith('.md'));

  let removedCount = 0;
  for (const file of commandFiles) {
    const filePath = path.join(commandsDir, file);
    if (fileExists(filePath)) {
      await fs.unlink(filePath);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(`  ✓ Removed ${removedCount} slash command(s)`);
  }
}

/**
 * Remove-feature command - disable features
 */
export async function removeFeatureCommand(args: string[]): Promise<void> {
  console.log('➖ cc-devtools remove-feature\n');

  // Validate we're in a project root
  ensureValidProjectRoot();

  const projectRoot = process.cwd();
  const options = parseRemoveFeatureArgs(args);

  // Get enabled features
  const enabledFeatures = await getEnabledFeatures(projectRoot);

  if (enabledFeatures.length === 0) {
    console.log('No features are currently enabled.\n');
    console.log('Run `npx cc-devtools setup` to enable features.\n');
    return;
  }

  // Get feature selection
  const features = await getFeatureSelection(options.features, enabledFeatures);

  if (features.length === 0) {
    console.log('No features selected. Exiting.\n');
    return;
  }

  // Check which features have data
  const featuresWithData = features.filter(f => {
    const info = FEATURE_INFO[f as FeatureName];
    return hasFeatureData(projectRoot, info.dataPath);
  });

  if (featuresWithData.length > 0) {
    console.log('\n⚠️  Warning: The following features have data:');
    for (const feature of featuresWithData) {
      const info = FEATURE_INFO[feature as FeatureName];
      console.log(`  • ${info.name}: ${info.dataPath}`);
    }
    console.log();
  }

  // Ask about data removal
  let shouldRemoveData = false;
  if (featuresWithData.length > 0) {
    if (options.keepData === true) {
      shouldRemoveData = false;
      console.log('Keeping data files (--keep-data flag)\n');
    } else if (options.keepData === false) {
      shouldRemoveData = true;
      console.log('Removing data files (--remove-data flag)\n');
    } else {
      shouldRemoveData = await confirm(
        'Do you want to remove the data files? (This cannot be undone)',
        false
      );
      console.log();
    }
  }

  console.log(`Removing features: ${features.join(', ')}\n`);

  // Confirm removal
  const confirmed = await confirm('Are you sure you want to proceed?', false);

  if (!confirmed) {
    console.log('\nCancelled. No changes made.\n');
    return;
  }

  console.log('\n📦 Removing features...\n');

  // Remove MCP servers
  console.log('📡 Removing MCP servers:');
  for (const feature of features) {
    await removeMcpServerForFeature(feature, projectRoot);
  }

  // Remove slash commands
  console.log('\n📝 Removing slash commands:');
  for (const feature of features) {
    await removeSlashCommands(feature, projectRoot);
  }

  // Remove data if requested
  if (shouldRemoveData && featuresWithData.length > 0) {
    console.log('\n🗑️  Removing data files:');
    for (const feature of featuresWithData) {
      await removeFeatureData(feature, projectRoot);
    }
  } else if (featuresWithData.length > 0) {
    console.log('\n💾 Keeping data files (can be removed manually later)');
  }

  // Success message
  console.log('\n✅ Features removed successfully!\n');

  if (!shouldRemoveData && featuresWithData.length > 0) {
    console.log('Note: Data files were preserved. To remove them:');
    for (const feature of featuresWithData) {
      const info = FEATURE_INFO[feature as FeatureName];
      console.log(`  rm -rf ${info.dataPath}`);
    }
    console.log();
  }

  console.log('Next steps:');
  console.log('  1. Restart Claude Code to unload the MCP servers');
  console.log('  2. Run `npx cc-devtools status` to verify\n');
}
