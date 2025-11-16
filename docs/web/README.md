# Web Server Documentation

**cc-devtools Web Server** provides a browser-based interface for managing your kanban board and editing source code. Access it from any device on your local network with built-in authentication and security.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Features](#features)
3. [Mobile Setup](#mobile-setup)
4. [Configuration](#configuration)
5. [Development](#development)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)
8. [Security](#security)

---

## Quick Start

### Start the Server

```bash
npx cc-devtools web

# Or clear all stored tokens before starting
npx cc-devtools web --invalidate-tokens
```

The server will:
1. Find the first available port starting from 9100
2. Generate a secure authentication token for this session
3. Load previously stored valid tokens from `cc-devtools/.cache/`
4. Display a QR code and URL in your terminal
5. Start serving the web interface

**Example Output:**
```
🚀 Starting web server...
📦 Loaded 2 stored token(s)
🔐 Token store initialized (3 valid token(s))
📡 Using port 9100
✅ Server running at: http://192.168.1.100:9100
🔑 Current session token: abc123def456...

📱 Mobile Setup: Scan this QR code
[QR CODE DISPLAYED HERE]

💡 Press Ctrl+C to stop the server
🔄 Tokens persist across restarts (use --invalidate-tokens to clear)
```

### Access from Desktop

1. Open the URL shown in your browser: `http://localhost:9100`
2. Add the token from the URL or terminal as a query parameter: `?token=abc123...`
3. The token will be saved to your browser and included in all requests automatically

### Access from Mobile

1. **Scan the QR code** displayed in the terminal with your phone camera
2. Your browser will open automatically with the token pre-filled
3. You're authenticated and ready to use the app!

---

## Features

### Kanban Board

- **Visual Board**: See all stories organized by status (Backlog, Active, Review, Done)
- **Drag-and-Drop**: Change story status by dragging cards between columns
- **CRUD Operations**: Create, edit, and delete stories and subtasks via forms
- **Filtering**: Filter by tags or search by title/description
- **Real-Time Updates**: Changes from CLI automatically reflect in the browser
- **Subtask Management**: Add, edit, and track subtasks within stories
- **Metadata Editing**: Manage tags, effort estimates, and acceptance criteria

### Code Editor

- **File Browser**: Navigate your project's file tree
- **Syntax Highlighting**: Support for 20+ programming languages
- **Desktop Editor**: Monaco Editor (VS Code's editor) on screens ≥768px
- **Mobile Editor**: CodeMirror 6 (lightweight, touch-friendly) on screens <768px
- **Auto-Save**: Press Ctrl+S / Cmd+S to save immediately
- **Split Pane**: Resizable file tree and editor panels
- **Multiple Tabs**: Open multiple files simultaneously

### Mobile-First Design

- **Responsive Layout**: Optimized for 320px (mobile) to 1920px+ (desktop)
- **Touch-Friendly**: Large touch targets, smooth gestures
- **Progressive Enhancement**: Desktop gets advanced features, mobile gets essentials

---

## Mobile Setup

### Option 1: QR Code (Recommended)

1. Run `npx cc-devtools web`
2. **Scan the QR code** with your phone camera
3. Browser opens with authentication pre-configured ✅

### Option 2: Manual URL Entry

1. Run `npx cc-devtools web`
2. Note the URL and token from terminal output
3. On your mobile browser, navigate to: `http://<local-ip>:<port>?token=<token>`
4. Example: `http://192.168.1.100:9100?token=abc123def456`

### Troubleshooting Mobile Access

**Can't connect from mobile?**
- Ensure your phone and computer are on the **same network**
- Check if your IP is in the whitelist (see [Configuration](#configuration))
- Try using your computer's local IP instead of `localhost`
- Verify your firewall allows connections on the server port

**Already authenticated but server restarted?**
- Your token is still valid! Just navigate to the app URL (no need to re-scan QR code)
- The server remembers all previously used tokens across restarts
- If you want to revoke all tokens, restart with: `npx cc-devtools web --invalidate-tokens`

---

## Configuration

### Configuration File

Create or edit `.claude/web.yaml` in your project root:

```yaml
# Server settings
server:
  portStart: 9100        # Start scanning from this port
  portRange: 100         # Scan up to portStart + portRange
  host: 0.0.0.0          # Bind to all interfaces (0.0.0.0) or specific IP

# Security settings
security:
  ipWhitelist:           # CIDR ranges allowed to access the server
    - 192.168.0.0/16     # Local network (192.168.x.x)
    - 10.0.0.0/8         # Private network (10.x.x.x)
    - 127.0.0.1          # Localhost
  rateLimit:
    windowMs: 900000     # 15 minutes (in milliseconds)
    maxAttempts: 5       # Max failed auth attempts before blocking IP

# Server-Sent Events (real-time updates)
sse:
  pingInterval: 30000    # Keep-alive ping every 30 seconds

# Code editor settings
editor:
  maxFileSize: 10485760  # 10MB file size limit (in bytes)
```

### CLI Overrides

Override config via command-line flags:

```bash
# Use specific port
npx cc-devtools web --port 8080

# Bind to specific host
npx cc-devtools web --host 127.0.0.1

# Use custom config file
npx cc-devtools web --config path/to/web.yaml
```

### IP Whitelist Configuration

**CIDR Notation Examples:**

- `192.168.0.0/16` - All IPs from 192.168.0.0 to 192.168.255.255
- `10.0.0.0/8` - All IPs from 10.0.0.0 to 10.255.255.255
- `172.16.0.0/12` - All IPs from 172.16.0.0 to 172.31.255.255
- `127.0.0.1` - Localhost only (IPv4)

**To allow all devices on your local network:**

Find your local IP (e.g., `192.168.1.100`), then add the appropriate range:
- If your IP is `192.168.x.x`, use `192.168.0.0/16`
- If your IP is `10.x.x.x`, use `10.0.0.0/8`

---

## Development

### Development Mode

Run the dev server with hot module reload (HMR):

```bash
npm run dev:web
```

This starts:
- **Vite dev server** on `http://localhost:5173` (frontend with HMR)
- **Express API server** on `http://localhost:9100` (backend)
- Vite proxies `/api` requests to the Express server

**Benefits:**
- Instant hot reload for frontend changes
- No build step required during development
- Full TypeScript support with type checking

### Build for Production

Build the frontend bundle:

```bash
npm run build:web
```

This creates optimized production assets in `dist/web/public/`:
- Minified JavaScript and CSS
- Code-split chunks (Kanban, Editor loaded on demand)
- Gzipped assets for faster loading

**Bundle Sizes:**
- Main bundle: ~80 KB (gzipped)
- Kanban page: ~23 KB (gzipped, lazy-loaded)
- Editor page: ~365 KB (gzipped, lazy-loaded with Monaco/CodeMirror)

### Architecture

```
src/web/
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── routes/          # API routes
│   │   ├── kanban.routes.ts    # Kanban CRUD operations
│   │   ├── files.routes.ts     # File browser and editor
│   │   └── index.ts            # Route aggregator + SSE endpoint
│   ├── middleware/      # Express middleware
│   │   ├── auth.middleware.ts  # Token validation
│   │   ├── ipWhitelist.middleware.ts  # IP filtering
│   │   └── rateLimit.middleware.ts    # Brute-force prevention
│   ├── config/          # Configuration
│   │   └── config.service.ts   # YAML config loader
│   ├── sse/             # Server-Sent Events
│   │   └── fileWatcher.ts      # File change notifications
│   └── utils/           # Utilities
│       ├── logger.ts    # Structured logging
│       └── qrCode.ts    # QR code generation
├── client/              # React frontend
│   ├── components/      # React components
│   │   ├── kanban/      # Kanban board UI
│   │   ├── editor/      # Code editor UI
│   │   └── common/      # Shared components (Button, Modal, Toast, etc.)
│   ├── pages/           # Page components
│   │   ├── LoginPage.tsx
│   │   ├── KanbanPage.tsx (lazy-loaded)
│   │   └── EditorPage.tsx (lazy-loaded)
│   ├── hooks/           # React Query hooks
│   │   ├── useStories.ts        # Kanban data operations
│   │   ├── useFiles.ts          # File operations
│   │   ├── useAuth.ts           # Authentication
│   │   └── useSSE.ts            # Real-time updates
│   ├── services/        # API clients
│   │   ├── api.service.ts       # Axios instance with auth
│   │   ├── kanban.service.ts    # Kanban API calls
│   │   └── files.service.ts     # File API calls
│   ├── stores/          # Zustand stores
│   │   └── uiStore.ts           # UI state (filters, etc.)
│   ├── App.tsx          # Root component
│   ├── main.tsx         # React entry point
│   └── index.css        # Global styles (Tailwind)
├── shared/              # Shared types
│   └── types.ts         # Web-specific types
├── vite.config.ts       # Vite configuration
└── README.md            # This file
```

---

## API Reference

All API endpoints require authentication via `Authorization: Bearer <token>` header (except `/api/health`).

### Health Check

**GET** `/api/health`

- **Description**: Check if server is running
- **Authentication**: Not required
- **Response**: `{ status: "healthy" }`

### Authentication

**POST** `/api/auth/validate`

- **Description**: Validate authentication token
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ authenticated: true }`
- **Error**: `401 Unauthorized` if token is invalid

### Kanban Operations

#### Stories

**GET** `/api/kanban/stories?status=<status>&tags=<tag1,tag2>`

- **Description**: List all stories with optional filters
- **Query Params**: `status`, `phase`, `label`, `businessValue`, `tags`
- **Response**: `Story[]`

**GET** `/api/kanban/stories/:id`

- **Description**: Get a single story by ID
- **Response**: `Story`

**POST** `/api/kanban/stories`

- **Description**: Create a new story
- **Body**: `{ title, description?, status?, tags?, effort?, acceptanceCriteria? }`
- **Response**: `Story` (with auto-generated ID)

**PUT** `/api/kanban/stories/:id`

- **Description**: Update an existing story
- **Body**: `{ title?, description?, status?, tags?, effort?, acceptanceCriteria? }`
- **Response**: `Story`

**PATCH** `/api/kanban/stories/:id/status`

- **Description**: Update only the story status (used for drag-and-drop)
- **Body**: `{ status: "backlog" | "active" | "review" | "done" }`
- **Response**: `Story`

**DELETE** `/api/kanban/stories/:id`

- **Description**: Delete a story
- **Response**: `204 No Content`

#### Subtasks

**POST** `/api/kanban/stories/:storyId/subtasks`

- **Description**: Create a subtask for a story
- **Body**: `{ title, description? }`
- **Response**: `Subtask`

**GET** `/api/kanban/subtasks/:id`

- **Description**: Get a single subtask by ID
- **Response**: `Subtask`

**PUT** `/api/kanban/subtasks/:id`

- **Description**: Update a subtask
- **Body**: `{ title?, description? }`
- **Response**: `Subtask`

**PATCH** `/api/kanban/subtasks/:id/status`

- **Description**: Update subtask status
- **Body**: `{ status: "pending" | "in_progress" | "done" }`
- **Response**: `Subtask`

**DELETE** `/api/kanban/subtasks/:id`

- **Description**: Delete a subtask
- **Response**: `204 No Content`

#### Metadata

**GET** `/api/kanban/tags`

- **Description**: Get all unique tags used across stories
- **Response**: `string[]`

**GET** `/api/kanban/config`

- **Description**: Get kanban configuration (statuses, workflows, limits)
- **Response**: `KanbanConfig`

### File Operations

**GET** `/api/files?path=<path>`

- **Description**: List files in a directory
- **Query Params**: `path` (default: `.`)
- **Response**: `FileTreeNode` (recursive tree structure)
- **Security**: Path traversal prevented, project-directory-only access

**GET** `/api/files/content?path=<path>`

- **Description**: Read file contents
- **Query Params**: `path` (required)
- **Response**: `{ path, content, language, size }`
- **Security**: Max 10MB file size, no directory traversal

**POST** `/api/files/content`

- **Description**: Write file contents
- **Body**: `{ path, content }`
- **Response**: `204 No Content`
- **Security**: Max 10MB, no directory traversal, validates path

### Real-Time Updates (SSE)

**GET** `/api/sse`

- **Description**: Server-Sent Events stream for real-time file changes
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `text/event-stream`
- **Events**:
  - `ping`: Keep-alive (every 30s)
  - `kanban_changed`: Kanban files modified (triggers frontend refetch)

**Example Client (Browser):**

```javascript
const eventSource = new EventSource('/api/sse');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'kanban_changed') {
    // Refetch kanban data
    queryClient.invalidateQueries(['kanban']);
  }
};
```

---

## Troubleshooting

### Server won't start

**Problem**: "Port 9100 already in use"

**Solution**:
- The server auto-scans for available ports (9100-9199)
- If all ports are in use, specify a different range in `web.yaml`:
  ```yaml
  server:
    portStart: 8080
    portRange: 100
  ```

### Can't connect from mobile

**Problem**: "Connection refused" or "Cannot connect to server"

**Solution**:
1. **Check IP whitelist**: Add your mobile device's IP range to `web.yaml`:
   ```yaml
   security:
     ipWhitelist:
       - 192.168.0.0/16  # Adjust to your network
   ```

2. **Verify same network**: Ensure phone and computer are on the same Wi-Fi

3. **Check firewall**: Allow incoming connections on the server port (e.g., 9100)

4. **Use local IP**: Don't use `localhost` from mobile - use your computer's local IP (e.g., `192.168.1.100`)

### Authentication fails

**Problem**: "401 Unauthorized" or "Invalid token"

**Solution**:
- **If you previously authenticated**: Your old token should still work! Try refreshing the page.
- **If using a new device**: Scan the QR code or enter the current session token from terminal
- **If tokens were invalidated**: Re-scan the QR code or copy the new token from terminal
- **Clear browser cache**: If issues persist, clear browser localStorage and re-authenticate
- **Check headers**: Verify token is included in the `Authorization: Bearer <token>` header

**To clear all stored tokens** (forcing re-authentication):
```bash
npx cc-devtools web --invalidate-tokens
```

### Rate limited / IP blocked

**Problem**: "429 Too Many Requests" or "403 Forbidden"

**Solution**:
- **Rate limit**: Wait 15 minutes after 5 failed auth attempts
- **IP blocked**: Check that your IP is in the whitelist in `web.yaml`
- Restart the server to clear rate limit counters (in-memory)

### Real-time updates not working

**Problem**: CLI changes don't appear in browser

**Solution**:
1. **Check SSE connection**: Open browser DevTools → Network → look for `/api/sse` connection
2. **Verify file watcher**: Server logs should show "📁 File watcher initialized"
3. **Manual refresh**: Reload the page to force data refetch

### Build fails

**Problem**: `npm run build:web` errors

**Solution**:
- **TypeScript errors**: Run `npm run typecheck` to see specific errors
- **Missing dependencies**: Run `npm install`
- **Vite errors**: Check that `vite.config.ts` output path is correct
- **Clear cache**: Delete `node_modules/.vite` and rebuild

---

## Security

### Authentication

- **Token-based**: Cryptographically secure 32-byte random token (generated via `crypto.randomBytes(32)`)
- **Token storage (browser)**: Saved in browser `localStorage`, sent via `Authorization` header
- **Token storage (server)**: Tokens persisted to `cc-devtools/.cache/web-tokens.msgpack` after first use
- **Token lifetime**: New token generated each server start, but previously used tokens remain valid
- **Token persistence**: Tokens survive server restarts - no need to re-authenticate
- **Token invalidation**: Use `--invalidate-tokens` flag to clear all stored tokens
- **QR code**: Token embedded in URL for frictionless mobile setup
- **Storage format**: MessagePack binary format (consistent with other cc-devtools cache files)

### Network Security

- **IP Whitelist**: Only whitelisted IPs can access the server (configurable CIDR ranges)
- **Rate Limiting**: 5 failed auth attempts → 15-minute IP block
- **File Access**: Restricted to project directory, no directory traversal (`../../../etc/passwd`)
- **File Size Limit**: Max 10MB per file (prevents abuse)

### Best Practices

✅ **DO:**
- Use on trusted local networks only (home, office VPN)
- Configure IP whitelist to match your network range
- Keep the auth token private (don't share screenshots with token visible)
- Use HTTPS if exposing to the internet (not included in Phase 1)

❌ **DON'T:**
- Expose to public internet without additional security (firewall, VPN, HTTPS)
- Share auth tokens publicly
- Disable IP whitelist unless necessary
- Store sensitive data in kanban YAML files (already plaintext on disk)

### Threat Model

**Protected Against:**
- Brute force auth attacks (rate limiting)
- Unauthorized network access (IP whitelist)
- Directory traversal attacks (path validation)
- File upload abuse (size limits)

**NOT Protected Against (out of scope for Phase 1):**
- Man-in-the-middle attacks (no HTTPS)
- Token theft via XSS (localStorage storage)
- Replay attacks (no token expiration)

For production use on untrusted networks, add:
- HTTPS/TLS encryption
- Token expiration and refresh
- CSRF protection
- Content Security Policy (CSP)

---

## Support

**Issues?** Report bugs or request features at: https://github.com/anthropics/cc-devtools/issues

**Documentation**: See main project README for CLI usage and kanban features.

---

**Built with:** React, Vite, TypeScript, Express, Tailwind CSS, TanStack Query, Monaco Editor, CodeMirror
