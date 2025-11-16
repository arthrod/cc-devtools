/**
 * Web server command
 * Start the web interface for cc-devtools
 */

import { startWebServer } from '../../../web/server/index.js';

import type { ConfigOverrides } from '../../../web/shared/types.js';

/**
 * Parse command line arguments for web server
 */
function parseWebArgs(args: string[]): ConfigOverrides & { invalidateTokens?: boolean } {
  const overrides: ConfigOverrides & { invalidateTokens?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--port' && args[i + 1]) {
      overrides.port = parseInt(args[i + 1] ?? '', 10);
      i++;
    } else if (arg === '--host' && args[i + 1]) {
      overrides.host = args[i + 1];
      i++;
    } else if (arg === '--ip-whitelist' && args[i + 1]) {
      overrides.ipWhitelist = (args[i + 1] ?? '').split(',').map(ip => ip.trim());
      i++;
    } else if (arg === '--invalidate-tokens') {
      overrides.invalidateTokens = true;
    } else if (arg === '--help') {
      showWebHelp();
      process.exit(0);
    }
  }

  return overrides;
}

/**
 * Show web command help
 */
function showWebHelp(): void {
  console.log(`
Usage: npx cc-devtools web [options]

Start the web interface for cc-devtools

Options:
  --port <number>           Starting port number (default: 9100)
  --host <string>           Host to bind to (default: 0.0.0.0)
  --ip-whitelist <ips>      Comma-separated list of IP CIDR ranges
  --invalidate-tokens       Clear all stored authentication tokens
  --help                    Show this help message

Examples:
  npx cc-devtools web
  npx cc-devtools web --port 8080
  npx cc-devtools web --host 127.0.0.1
  npx cc-devtools web --ip-whitelist "192.168.0.0/16,10.0.0.0/8"
  npx cc-devtools web --invalidate-tokens

Token Persistence:
  Valid authentication tokens are automatically stored in cc-devtools/.cache/
  On server restart, previously used tokens will still be valid
  Use --invalidate-tokens to clear all stored tokens

Configuration:
  Default configuration is loaded from .claude/web.yaml
  Command line options override configuration file settings

  Example .claude/web.yaml:
    server:
      portStart: 9100
      portRange: 100
      host: 0.0.0.0
    security:
      ipWhitelist:
        - 192.168.0.0/16
        - 10.0.0.0/8
        - 127.0.0.1
      rateLimit:
        windowMs: 900000
        maxAttempts: 5
`);
}

/**
 * Web command handler
 */
export async function webCommand(args: string[]): Promise<void> {
  const overrides = parseWebArgs(args);

  try {
    await startWebServer(overrides);
  } catch (error) {
    console.error('Failed to start web server:', (error as Error).message);
    process.exit(1);
  }
}
