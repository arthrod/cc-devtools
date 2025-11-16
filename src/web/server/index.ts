/**
 * Web server entry point
 * Express server with authentication, IP whitelist, and rate limiting
 */

import { randomBytes } from 'crypto';
import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { createApp as createVibeApp } from 'vibetunnel/dist/server/server.js';

import type { ConfigOverrides } from '../shared/types.js';

import { loadWebConfig } from './config/config.service.js';
import { createAuthMiddleware } from './middleware/auth.middleware.js';
import { createIPWhitelistMiddleware, validateCIDRList, normalizeIP, ipMatchesCIDR } from './middleware/ipWhitelist.middleware.js';
import { createRateLimitMiddleware } from './middleware/rateLimit.middleware.js';
import { createAPIRouter } from './routes/index.js';
import { TokenStore } from './services/tokenStore.service.js';
import { initializeFileWatcher, shutdownFileWatcher } from './sse/fileWatcher.js';
import * as logger from './utils/logger.js';
import { displayServerInfo } from './utils/qrCode.js';

import type { WebSocket } from 'ws';

/**
 * Generate cryptographically secure authentication token
 */
function generateAuthToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Find available port starting from portStart
 */
async function findAvailablePort(portStart: number, portRange: number, host: string): Promise<number> {
  const net = await import('net');

  for (let offset = 0; offset < portRange; offset++) {
    const port = portStart + offset;

    try {
      await new Promise<void>((resolve, reject) => {
        const server = net.createServer();

        server.once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            reject(err);
          } else {
            reject(err);
          }
        });

        server.once('listening', () => {
          server.close(() => resolve());
        });

        server.listen(port, host);
      });

      // Port is available
      return port;
    } catch {
      // Port is in use, try next one
      continue;
    }
  }

  throw new Error(
    `No available ports found in range ${portStart}-${portStart + portRange - 1}`
  );
}

/**
 * Start web server
 */
export async function startWebServer(overrides?: ConfigOverrides & { invalidateTokens?: boolean }): Promise<void> {
  // Load configuration
  const config = loadWebConfig(overrides);

  logger.info('🚀 Starting web server...');

  // Validate IP whitelist
  if (!validateCIDRList(config.security.ipWhitelist)) {
    throw new Error('Invalid CIDR notation in IP whitelist');
  }

  // Generate authentication token for this session
  const authToken = generateAuthToken();

  // Initialize token store (stored in cc-devtools/.cache/ alongside embeddings)
  const tokenStorePath = join(process.cwd(), 'cc-devtools', '.cache', 'web-tokens.msgpack');
  const tokenStore = new TokenStore(tokenStorePath, authToken);

  // Handle token invalidation if requested
  if (overrides?.invalidateTokens) {
    await tokenStore.invalidateAll();
    logger.info('🗑️  Cleared all stored tokens');
  }

  // Load previously stored tokens
  await tokenStore.load();

  const stats = tokenStore.getStats();
  logger.info(`🔐 Token store initialized (${stats.total} valid token(s))`);

  // Find available port
  const port = await findAvailablePort(
    config.server.portStart,
    config.server.portRange,
    config.server.host
  );

  logger.info(`📡 Using port ${port}`);

  // Create Express app
  const app = express();

  // Enable CORS
  app.use(cors({
    origin: true,  // Allow all origins (we're using IP whitelist instead)
    credentials: true,
  }));

  // Parse JSON bodies
  app.use(express.json());

  // Enable gzip/brotli compression for all responses
  app.use(compression({
    level: 6, // Compression level (0-9, default 6)
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      // Don't compress SSE responses
      if (req.path === '/api/sse') {
        return false;
      }
      return compression.filter(req, res);
    },
  }));

  // Serve static files (built frontend) - before auth check
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const publicPath = join(__dirname, '../public');

  // Check if we're in dev mode (public directory doesn't exist)
  const { existsSync } = await import('fs');
  const isDevMode = !existsSync(publicPath);

  if (isDevMode) {
    logger.warn('⚠️  Running in DEV mode - static files not served (use Vite dev server on port 5173)');
  } else {
    app.use(express.static(publicPath));
  }

  // Serve VibeTunnel static assets (fonts, Monaco Editor, etc.)
  const vibeTunnelPublicPath = join(process.cwd(), 'node_modules', 'vibetunnel', 'public');
  app.use(express.static(vibeTunnelPublicPath));

  // Apply rate limiting (before auth to limit brute force)
  app.use(createRateLimitMiddleware(config.security.rateLimit));

  // Apply IP whitelist
  app.use(createIPWhitelistMiddleware(config.security.ipWhitelist));

  // Health check endpoint (no auth required)
  app.get('/cc-api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Auth validation endpoint
  app.get('/cc-api/auth/validate', createAuthMiddleware(tokenStore), (_req, res) => {
    res.json({ authenticated: true });
  });

  // VibeTunnel auth config endpoint (no auth required)
  // Must be before our API routes so VibeTunnel client can detect no-auth mode
  app.get('/api/auth/config', (_req, res) => {
    res.json({ noAuth: true });
  });

  // VibeTunnel auth verify endpoint (no auth required)
  // Return valid response to prevent 401 errors in console when running in no-auth mode
  app.get('/api/auth/verify', (_req, res) => {
    res.json({ valid: true });
  });

  // Protected API routes (require auth) - mounted BEFORE VibeTunnel
  // Uses /cc-api prefix to avoid conflicts with VibeTunnel's /api routes
  app.use('/cc-api', createAPIRouter(tokenStore, config));

  // Initialize VibeTunnel and mount AFTER our API routes
  logger.info('🔌 Initializing VibeTunnel...');

  let vibeInstance: Awaited<ReturnType<typeof createVibeApp>> | null = null;

  try {
    // Disable VibeTunnel's authentication (we use our own auth middleware)
    // VibeTunnel reads config from process.argv
    const originalArgv = process.argv;
    process.argv = [...process.argv, '--no-auth'];

    vibeInstance = await createVibeApp();

    // Restore original argv
    process.argv = originalArgv;

    // SPA fallback middleware - serve index.html for client-side routes
    // Must be BEFORE VibeTunnel mount to prevent VibeTunnel from handling SPA routes
    // cc-devtools routes: /cc-api/* (our app)
    // VibeTunnel routes: /api/* (sessions, filesystem, logs, etc.), /buffers (WS), /ws/* (WS)
    app.use((req, res, next) => {
      // Skip if already handled by earlier middleware
      if (res.headersSent) {
        return next();
      }

      const path = req.path;

      // Let cc-devtools API routes pass through (handled before this middleware)
      if (path.startsWith('/cc-api/')) {
        return next();
      }

      // Let VibeTunnel API routes pass through
      if (path.startsWith('/api/')) {
        return next();
      }

      // Let VibeTunnel WebSocket routes pass through
      if (path.startsWith('/buffers') ||
          path.startsWith('/ws/')) {
        return next();
      }

      // Let static file middleware handle assets (already handled, but be explicit)
      if (path.startsWith('/assets/') ||
          path.startsWith('/vibetunnel/') ||
          path === '/logo-square.png') {
        return next();
      }

      // In dev mode, redirect to Vite dev server instead of serving index.html
      if (isDevMode) {
        return res.status(200).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>cc-devtools - Dev Mode</title>
            </head>
            <body>
              <h1>Development Mode</h1>
              <p>Please access the frontend via Vite dev server:</p>
              <p><a href="http://localhost:5173">http://localhost:5173</a></p>
            </body>
          </html>
        `);
      }

      // Everything else is a client-side route - serve index.html
      res.sendFile(join(publicPath, 'index.html'));
    });

    // Mount VibeTunnel's Express app at root
    // The middleware above ensures SPA routes (like /kanban, /memory) are served index.html
    // VibeTunnel will receive /api/* routes and WebSocket paths (/buffers, /ws/*)
    app.use('/', vibeInstance.app);

    logger.info('✅ VibeTunnel app mounted at / (client paths: /api/sessions, /buffers)');
  } catch (error) {
    logger.error('❌ Failed to initialize VibeTunnel:', error);
    logger.warn('⚠️  Console feature will not be available');
  }

  // Final SPA fallback for when VibeTunnel is not available
  // This ensures SPA routing still works if VibeTunnel fails to initialize
  app.get('*', (_req, res) => {
    if (isDevMode) {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>cc-devtools - Dev Mode</title>
          </head>
          <body>
            <h1>Development Mode</h1>
            <p>Please access the frontend via Vite dev server:</p>
            <p><a href="http://localhost:5173">http://localhost:5173</a></p>
          </body>
        </html>
      `);
    }
    return res.sendFile(join(publicPath, 'index.html'));
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('❌ Server error:', err);

    res.status(500).json({
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    });
  });

  // Initialize file watcher for SSE
  // Watch cc-devtools directory (contains memory.yaml, plans/, kanban/)
  const fileWatcher = initializeFileWatcher('cc-devtools', config.sse);
  fileWatcher.start();

  logger.info('📁 File watcher initialized (watching cc-devtools/)');

  // Create HTTP server
  const server = createServer(app);

  // Attach VibeTunnel's WebSocket server to our HTTP server
  if (vibeInstance?.wss) {
    logger.info('🔌 Attaching VibeTunnel WebSocket server...');

    // VibeTunnel's WebSocket server needs to handle upgrade requests
    server.on('upgrade', (request, socket, head) => {
      // Handle VibeTunnel WebSocket paths:
      // - /buffers (terminal output stream)
      // - /ws/input (terminal input stream)
      // - /ws/control (control messages)
      if (!request.url) {
        logger.error('❌ WebSocket upgrade request missing URL property');
        socket.destroy();
        return;
      }

      // Parse URL to extract pathname and search params
      // VibeTunnel expects these properties on the request object
      const parsedUrl = new URL(
        request.url,
        `http://${request.headers.host ?? 'localhost'}`
      );

      const isVibeWebSocket = parsedUrl.pathname.startsWith('/buffers') ||
                             parsedUrl.pathname.startsWith('/ws/input') ||
                             parsedUrl.pathname.startsWith('/ws/control');

      if (!isVibeWebSocket) {
        logger.warn(`❌ Unknown WebSocket path: ${parsedUrl.pathname}`);
        socket.destroy();
        return;
      }

      // SECURITY: IP Whitelist Check
      // WebSocket upgrades bypass Express middleware, so we must validate manually
      const remoteAddress = String(request.socket.remoteAddress ?? 'unknown');
      const clientIP = normalizeIP(remoteAddress);
      const isIPWhitelisted = config.security.ipWhitelist.some((cidr: string) =>
        ipMatchesCIDR(clientIP, cidr)
      );

      if (!isIPWhitelisted) {
        logger.warn(`🚫 Blocked WebSocket from non-whitelisted IP: ${clientIP}`);
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      // SECURITY: Token Authentication Check
      // Extract token from query params (preferred) or Authorization header
      const tokenFromQuery = parsedUrl.searchParams.get('token');
      const authHeader = request.headers['authorization'];
      const tokenFromHeader = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : authHeader;
      const token = tokenFromQuery ?? tokenFromHeader;

      if (!token || !tokenStore.isValid(token)) {
        logger.warn(`🚫 Blocked WebSocket with invalid/missing token from ${clientIP}`);
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      logger.debug(`✅ WebSocket upgrade authorized: ${parsedUrl.pathname} from ${clientIP}`);

      // Let VibeTunnel's WebSocket server handle the upgrade
      vibeInstance.wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        // Augment request object with parsed URL components
        // VibeTunnel's connection handler expects these properties
        const augmentedRequest = request as typeof request & {
          pathname: string;
          searchParams: URLSearchParams;
        };
        augmentedRequest.pathname = parsedUrl.pathname;
        augmentedRequest.searchParams = parsedUrl.searchParams;

        logger.debug(`Emitting connection for: ${parsedUrl.pathname}`);
        vibeInstance.wss.emit('connection', ws, augmentedRequest);
      });
    });

    logger.info('✅ VibeTunnel WebSocket server attached');
  }

  // Start listening
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);

    server.listen(port, config.server.host, () => {
      resolve();
    });
  });

  // Configure console service with the actual server port
  if (vibeInstance) {
    const { configureVibeClient } = await import('./services/console.service.js');
    configureVibeClient(port);
  }

  // Display server info and QR code
  displayServerInfo(port, tokenStore.getCurrentToken());

  if (isDevMode) {
    logger.info('');
    logger.info('🔥 DEV MODE ACTIVE');
    logger.info('   Frontend: http://localhost:5173 (Vite dev server with hot-reload)');
    logger.info('   Backend:  http://localhost:' + port + ' (API & WebSocket only)');
    logger.info('');
  }

  logger.info('💡 Press Ctrl+C to stop the server');
  logger.info('🔄 Tokens persist across restarts (use --invalidate-tokens to clear)');

  // Handle graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`\n${signal} received, shutting down gracefully...`);

    // Stop accepting new connections
    server.close(() => {
      logger.info('HTTP server closed');
    });

    // Stop file watcher
    await shutdownFileWatcher();

    logger.info('✅ Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
}

/**
 * Main entry point
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  startWebServer().catch((error: Error) => {
    logger.error('❌ Failed to start web server:', error.message);
    process.exit(1);
  });
}
