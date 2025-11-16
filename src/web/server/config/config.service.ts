/**
 * Web server configuration service
 * Loads configuration from .claude/web.yaml with CLI overrides
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { load as parseYaml } from 'js-yaml';

import type { WebConfig, ConfigOverrides } from '../../shared/types.js';

/**
 * Default web server configuration
 */
const DEFAULT_CONFIG: WebConfig = {
  server: {
    portStart: 9100,
    portRange: 100,
    host: '0.0.0.0',
  },
  security: {
    ipWhitelist: [
      '192.168.0.0/16', // Local network
      '10.0.0.0/8',     // VPN
      '100.64.0.0/10',  // Tailscale (CGNAT range)
      '127.0.0.1',      // Localhost
    ],
    rateLimit: {
      windowMs: 900000,   // 15 minutes
      maxAttempts: 5,
    },
  },
  sse: {
    pingInterval: 30000,  // 30 seconds
  },
  editor: {
    maxFileSize: 10485760,  // 10MB
  },
};

/**
 * Load web server configuration from .claude/web.yaml
 */
export function loadWebConfig(overrides?: ConfigOverrides): WebConfig {
  const configPath = join(process.cwd(), '.claude', 'web.yaml');

  let config = { ...DEFAULT_CONFIG };

  // Load from file if it exists
  if (existsSync(configPath)) {
    try {
      const yamlContent = readFileSync(configPath, 'utf-8');
      const parsedConfig = parseYaml(yamlContent) as Partial<WebConfig>;

      // Deep merge with defaults
      config = {
        server: {
          ...DEFAULT_CONFIG.server,
          ...(parsedConfig.server ?? {}),
        },
        security: {
          ipWhitelist: parsedConfig.security?.ipWhitelist ?? DEFAULT_CONFIG.security.ipWhitelist,
          rateLimit: {
            ...DEFAULT_CONFIG.security.rateLimit,
            ...(parsedConfig.security?.rateLimit ?? {}),
          },
        },
        sse: {
          ...DEFAULT_CONFIG.sse,
          ...(parsedConfig.sse ?? {}),
        },
        editor: {
          ...DEFAULT_CONFIG.editor,
          ...(parsedConfig.editor ?? {}),
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to load web config from ${configPath}: ${(error as Error).message}`
      );
    }
  }

  // Apply CLI overrides
  if (overrides) {
    if (overrides.port !== undefined) {
      config.server.portStart = overrides.port;
    }
    if (overrides.host !== undefined) {
      config.server.host = overrides.host;
    }
    if (overrides.ipWhitelist !== undefined) {
      config.security.ipWhitelist = overrides.ipWhitelist;
    }
  }

  // Validate configuration
  validateConfig(config);

  return config;
}

/**
 * Validate configuration values
 */
function validateConfig(config: WebConfig): void {
  // Validate port range
  if (config.server.portStart < 1 || config.server.portStart > 65535) {
    throw new Error('Port must be between 1 and 65535');
  }

  if (config.server.portRange < 1 || config.server.portRange > 1000) {
    throw new Error('Port range must be between 1 and 1000');
  }

  // Validate host
  if (!config.server.host || config.server.host.trim() === '') {
    throw new Error('Host cannot be empty');
  }

  // Validate IP whitelist (basic validation - detailed CIDR validation in middleware)
  if (!Array.isArray(config.security.ipWhitelist) || config.security.ipWhitelist.length === 0) {
    throw new Error('IP whitelist must contain at least one entry');
  }

  // Validate rate limit
  if (config.security.rateLimit.windowMs < 1000) {
    throw new Error('Rate limit window must be at least 1000ms');
  }

  if (config.security.rateLimit.maxAttempts < 1) {
    throw new Error('Rate limit max attempts must be at least 1');
  }

  // Validate SSE ping interval
  if (config.sse.pingInterval < 1000) {
    throw new Error('SSE ping interval must be at least 1000ms');
  }

  // Validate editor max file size
  if (config.editor.maxFileSize < 1024) {
    throw new Error('Editor max file size must be at least 1KB');
  }
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): WebConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as WebConfig;
}
