import path from 'path';

import { initCommand } from '../kanban/init.js';

import { fileExists, ensureDir, copyFile } from '../../utils/fs-utils.js';
import { addMcpServer, readMcpConfig } from '../../utils/mcp-config.js';
import { confirm, multiSelect } from '../../utils/prompts.js';
import { ensureValidProjectRoot, validateFeatures } from '../../utils/validation.js';

const FEATURE_INFO = {
  kanban: {
    name: 'Kanban',
    mcpServerName: 'cc-devtools-kanban',
    description: 'Project management with kanban board',
  },
  memory: {
    name: 'Memory',
    mcpServerName: 'cc-devtools-memory',
    description: 'Persistent memory with semantic search',
  },
  planner: {
    name: 'Planner',
    mcpServerName: 'cc-devtools-planner',
    description: 'Implementation planning and tracking',
  },
  'source-code-mapper': {
    name: 'Source Code Mapper',
    mcpServerName: 'cc-devtools-source-code-mapper',
    description: 'Semantic code search and mapping',
  },
  clipboard: {
    name: 'Clipboard',
    mcpServerName: 'cc-devtools-clipboard',
    description: 'Copy content to system clipboard',
  },
  workflow: {
    name: 'Workflow',
    mcpServerName: '', // CLI-only, no MCP server
    description: 'Automated workflow and code review',
  },
} as const;

type FeatureName = keyof typeof FEATURE_INFO;

import type { FeatureCommandOptions } from '../../types.js';

type AddFeatureOptions = FeatureCommandOptions;

/**
 * Parse command-line flags
 */
function parseAddFeatureArgs(args: string[]): AddFeatureOptions {
  const options: AddFeatureOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--features=')) {
      const featuresStr = arg.split('=')[1];
      options.features = featuresStr.split(',').map(f => f.trim());
    } else if (arg === '--slash-commands') {
      options.slashCommands = true;
    } else if (arg === '--no-slash-commands') {
      options.slashCommands = false;
    }
  }

  return options;
}

/**
 * Check if feature is already enabled
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
 * Get features that are not yet enabled
 */
async function getAvailableFeatures(projectRoot: string): Promise<string[]> {
  const mcpConfigPath = path.join(projectRoot, '.mcp.json');
  const mcpConfig = fileExists(mcpConfigPath) ? await readMcpConfig(projectRoot) : {};

  const available: string[] = [];

  for (const [featureKey, info] of Object.entries(FEATURE_INFO)) {
    // Workflow feature has no MCP server, check for config files instead
    if (featureKey === 'workflow') {
      const workflowConfigPath = path.join(projectRoot, 'cc-devtools', 'workflow', 'config.yaml');
      if (!fileExists(workflowConfigPath)) {
        available.push(featureKey);
      }
      continue;
    }

    if (!isFeatureEnabled(mcpConfig, info.mcpServerName)) {
      available.push(featureKey);
    }
  }

  return available;
}

/**
 * Get feature selection (from flags or interactive prompt)
 */
async function getFeatureSelection(
  providedFeatures: string[] | undefined,
  availableFeatures: string[]
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

    // Filter to only available features
    const notAvailable = valid.filter(f => !availableFeatures.includes(f));
    if (notAvailable.length > 0) {
      console.error(`Error: Features already enabled: ${notAvailable.join(', ')}`);
      process.exit(1);
    }

    return valid;
  }

  // Interactive selection
  const choices = availableFeatures.map(key => {
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

  return multiSelect('Which features would you like to add?', choices, []);
}

/**
 * Setup workflow configuration files
 */
async function setupWorkflow(projectRoot: string): Promise<void> {
  const packageRoot = path.join(projectRoot, 'node_modules', '@shaenchen', 'cc-devtools');
  const workflowDir = path.join(projectRoot, 'cc-devtools', 'workflow');
  const templatesDir = path.join(packageRoot, 'templates', 'workflow');

  // Create workflow directory
  await ensureDir(workflowDir);

  // Copy workflow config files from templates
  const configFiles = ['config.yaml', 'decision-tree.yaml', 'reviewers.yaml'];

  for (const configFile of configFiles) {
    const src = path.join(templatesDir, configFile);
    const dest = path.join(workflowDir, configFile);

    // Only copy if file doesn't exist
    if (!fileExists(dest)) {
      await copyFile(src, dest);
      console.log(`  ✓ Created ${configFile}`);
    } else {
      console.log(`  ℹ ${configFile} already exists (skipping)`);
    }
  }
}

/**
 * Setup MCP server for a feature
 */
async function setupMcpServer(feature: string, projectRoot: string): Promise<void> {
  const info = FEATURE_INFO[feature as FeatureName];
  const packageRoot = path.join(projectRoot, 'node_modules', '@shaenchen', 'cc-devtools');

  // Most features have mcp-server directory, but some (like clipboard) have index.ts at feature root
  const mcpServerPathWithDir = path.join(packageRoot, 'dist', feature, 'mcp-server', 'index.js');
  const mcpServerPathDirect = path.join(packageRoot, 'dist', feature, 'index.js');

  // Use direct path if mcp-server directory doesn't exist
  const mcpServerPath = fileExists(mcpServerPathWithDir) ? mcpServerPathWithDir : mcpServerPathDirect;

  await addMcpServer(
    info.mcpServerName,
    {
      command: 'node',
      args: [mcpServerPath],
      disabled: false,
    },
    projectRoot
  );

  console.log(`  ✓ Added MCP server: ${info.mcpServerName}`);
}

/**
 * Copy slash command templates for a feature
 */
async function copySlashCommands(feature: string, projectRoot: string): Promise<void> {
  const packageRoot = path.join(projectRoot, 'node_modules', '@shaenchen', 'cc-devtools');
  const featureTemplatesDir = path.join(packageRoot, 'templates', 'commands', feature);
  const destDir = path.join(projectRoot, '.claude', 'commands');

  // Check if templates exist for this feature
  if (!fileExists(featureTemplatesDir)) {
    console.log(`  ℹ No slash commands for ${feature}`);
    return;
  }

  // Ensure destination directory exists
  await ensureDir(destDir);

  // Copy all template files from the feature directory
  const fs = await import('fs/promises');
  const files = await fs.readdir(featureTemplatesDir);

  let copiedCount = 0;
  for (const file of files) {
    if (!file.endsWith('.md')) {
      continue;
    }

    const src = path.join(featureTemplatesDir, file);
    const dest = path.join(destDir, file);

    // Check if file already exists
    if (fileExists(dest)) {
      console.log(`  ⚠ Slash command already exists: ${file} (skipping)`);
      continue;
    }

    await copyFile(src, dest);
    copiedCount++;
  }

  if (copiedCount > 0) {
    console.log(`  ✓ Copied ${copiedCount} slash command(s)`);
  }
}

/**
 * Add-feature command - enable additional features
 */
export async function addFeatureCommand(args: string[]): Promise<void> {
  console.log('➕ cc-devtools add-feature\n');

  // Validate we're in a project root
  ensureValidProjectRoot();

  const projectRoot = process.cwd();
  const options = parseAddFeatureArgs(args);

  // Check if package is installed
  const packagePath = path.join(projectRoot, 'node_modules', '@shaenchen', 'cc-devtools');
  if (!fileExists(packagePath)) {
    console.error('❌ Error: @shaenchen/cc-devtools is not installed locally.\n');
    console.error('Please install the package first:');
    console.error('  npm install @shaenchen/cc-devtools\n');
    process.exit(1);
  }

  // Get available features
  const availableFeatures = await getAvailableFeatures(projectRoot);

  // Filter out CLI-only features (like workflow) for the "all enabled" check
  const availableMcpFeatures = availableFeatures.filter(f => {
    const info = FEATURE_INFO[f as FeatureName];
    return info.mcpServerName !== '';
  });

  if (availableMcpFeatures.length === 0) {
    console.log('✓ All features are already enabled!\n');
    console.log('Enabled features:');
    for (const info of Object.values(FEATURE_INFO)) {
      console.log(`  • ${info.name}`);
    }
    console.log('\nRun `npx cc-devtools status` to see details.\n');
    return;
  }

  // Get feature selection
  const features = await getFeatureSelection(options.features, availableFeatures);

  if (features.length === 0) {
    console.log('No features selected. Exiting.\n');
    return;
  }

  console.log(`\nAdding features: ${features.join(', ')}\n`);

  // Ask about slash commands (if not specified via flag)
  const shouldCopySlashCommands =
    options.slashCommands ?? await confirm('Copy slash command templates to .claude/commands/?', true);

  console.log('\n📦 Adding features...\n');

  // Check workflow dependency on kanban
  if (features.includes('workflow')) {
    const mcpConfig = await readMcpConfig(projectRoot);
    const kanbanEnabled = isFeatureEnabled(mcpConfig as unknown as Record<string, unknown>, 'cc-devtools-kanban');
    if (!kanbanEnabled) {
      console.error('❌ Error: Workflow feature requires kanban feature');
      console.error('Please enable kanban first: npx cc-devtools add-feature --features=kanban\n');
      process.exit(1);
    }
  }

  // Setup MCP servers
  console.log('📡 Configuring MCP servers:');
  for (const feature of features) {
    // Skip MCP server setup for workflow (it's CLI-only)
    if (feature === 'workflow') {
      continue;
    }
    await setupMcpServer(feature, projectRoot);
  }

  // Copy slash commands
  if (shouldCopySlashCommands) {
    console.log('\n📝 Copying slash command templates:');
    for (const feature of features) {
      await copySlashCommands(feature, projectRoot);
    }
  }

  // Setup workflow configuration if workflow feature is enabled
  if (features.includes('workflow')) {
    console.log('\n⚙️  Setting up workflow configuration:');
    await setupWorkflow(projectRoot);
  }

  // Initialize kanban system if kanban feature is enabled
  if (features.includes('kanban')) {
    console.log('\n🗂️  Initializing kanban system:');
    try {
      const result = await initCommand([], {});
      if (result.success) {
        // @inline-type-allowed - one-off type assertion for init command result
        const data = result.data as { fixes?: string[]; issues?: Array<{ type: string; message: string }> };
        if (data?.fixes && data.fixes.length > 0) {
          // Print each fix message
          for (const fix of data.fixes) {
            console.log(`  ${fix}`);
          }
        } else if (!data?.issues || data.issues.filter(i => i.type === 'ERROR').length === 0) {
          console.log('  ✓ Kanban system validated');
        }
      }
    } catch (_error) {
      console.error('  ⚠ Warning: Failed to initialize kanban system');
      console.error('  You can initialize it manually: npx cc-devtools kanban init');
    }
  }

  // Success message
  console.log('\n✅ Features added successfully!\n');
  console.log('Next steps:');
  console.log('  1. Restart Claude Code to load the new MCP servers');
  console.log('  2. Update your output-style with new features:');
  console.log('     npx cc-devtools suggest-output-style');
  console.log('     (Adds guidance for the new features)');
  console.log('  3. Start using the new features:');
  for (const feature of features) {
    const info = FEATURE_INFO[feature as FeatureName];
    console.log(`     - ${info.name}`);
  }
  console.log('\nRun `npx cc-devtools status` to verify.\n');
}
