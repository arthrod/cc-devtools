# Remote Console - Technical Documentation

**Component:** Web Application - Remote Console Feature
**Technology Stack:** React + Express + VibeTunnel + xterm.js
**Status:** Production Ready
**Last Updated:** 2025-10-20

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [API Reference](#api-reference)
- [Session Management](#session-management)
- [Frontend Integration](#frontend-integration)
- [VibeTunnel Integration](#vibetunnel-integration)
- [State Management](#state-management)
- [Persistence Layer](#persistence-layer)
- [WebSocket Protocol](#websocket-protocol)
- [Security](#security)
- [Performance](#performance)
- [Development Guide](#development-guide)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Remote Console feature provides web-based terminal access through the cc-devtools web application. It allows users to open multiple terminal sessions in a tabbed interface, with sessions persisting across page refreshes and browser restarts.

### Key Features

- **Multiple Terminal Sessions**: Open many terminal sessions simultaneously in separate tabs
- **Session Persistence**: Sessions survive page refreshes and browser restarts
- **Tab Management**: Create, rename, switch, and close tabs with intuitive UI
- **Directory Tracking**: Tab names auto-update based on current working directory
- **User Isolation**: Sessions are isolated by user authentication
- **Efficient Streaming**: Binary WebSocket protocol for minimal bandwidth

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18.3.1 | UI framework |
| | React Router v6 | Client-side routing |
| | VibeTunnel Client | Web components for terminal rendering |
| | xterm.js | Terminal emulator (bundled with VibeTunnel) |
| | Lit | Web components runtime (bundled with VibeTunnel) |
| | Tailwind CSS | Styling |
| **Backend** | Express.js | HTTP server |
| | VibeTunnel Server | Terminal streaming middleware |
| | node-pty | PTY process management |
| | WebSocket (ws) | Real-time communication |
| **Build** | Vite | Frontend bundler |
| | TypeScript 5.x | Type safety |

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  ConsolePage (React)                                        │ │
│  │  ├─ ConsoleHeader (New Session button)                    │ │
│  │  ├─ ConsoleTabs (Tab management)                          │ │
│  │  └─ ConsoleContent                                         │ │
│  │      └─ VibeTerminal (React wrapper)                      │ │
│  │          └─ <vibe-terminal> (Lit web component)           │ │
│  │               └─ xterm.js (terminal rendering)            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                      │
│                    ┌──────┴──────┐                              │
│                    │              │                              │
│              HTTP (REST)    WebSocket (binary)                   │
└─────────────────────────────────────────────────────────────────┘
                      │              │
                      ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express Server (Node.js)                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Auth Middleware (token validation)                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Console Routes (/api/console/sessions)                   │  │
│  │  └─ console.service.ts (session management)               │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  VibeTunnel Middleware (/api/vibe/*)                      │  │
│  │  ├─ REST API (/api/vibe/api/sessions)                     │  │
│  │  └─ WebSocket Server (/api/vibe/ws/*)                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  node-pty (PTY process manager)                           │  │
│  │  └─ bash/zsh/sh processes (actual terminals)              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
                     Operating System
```

### Data Flow

**Session Creation:**
```
User clicks "New Session"
  → Frontend: SessionSelectModal opens
  → User clicks "Create New Session"
  → Frontend: POST /api/console/sessions
  → Backend: console.service.createSession()
  → Backend: POST /api/vibe/api/sessions (VibeTunnel)
  → VibeTunnel: Spawn PTY process via node-pty
  → VibeTunnel: Return sessionId
  → Backend: Store session metadata (userId, sessionId)
  → Backend: Return session details to frontend
  → Frontend: Add new tab with sessionId
  → Frontend: Render <vibe-terminal session-id="...">
  → VibeTunnel Client: Establish WebSocket connection
  → Terminal ready for user input
```

**Terminal I/O:**
```
User types in terminal
  → xterm.js: Capture keyboard event
  → VibeTunnel Client: Send input via WebSocket (text)
  → WebSocket: /api/vibe/ws/input?sessionId=X
  → VibeTunnel Server: Forward to PTY stdin
  → PTY Process: Execute command
  → PTY Process: Write output to stdout
  → VibeTunnel Server: Capture output
  → VibeTunnel Server: Send delta via WebSocket (binary)
  → WebSocket: /api/vibe/ws/buffer?sessionId=X
  → VibeTunnel Client: Apply delta to terminal buffer
  → xterm.js: Render updated screen
```

**Session Persistence:**
```
Page Load
  → Frontend: Load tabs from localStorage
  → Frontend: GET /api/console/sessions (validate sessions)
  → Backend: Return list of active sessions
  → Frontend: Cross-reference localStorage tabs
  → Frontend: Remove tabs for dead sessions
  → Frontend: Save cleaned tab list to localStorage
  → Frontend: Render tabs
  → Frontend: Establish WebSocket for active tab
```

---

## Components

### Backend Components

#### `/src/web/server/index.ts`
Express server entry point. Integrates VibeTunnel middleware and console routes.

**Key Responsibilities:**
- Initialize Express app
- Mount console routes with auth middleware
- Mount VibeTunnel middleware at `/api/vibe/*`
- Attach VibeTunnel WebSocket server to HTTP server
- Configure VibeTunnel with `--no-auth` flag

**VibeTunnel Integration:**
```typescript
// Create VibeTunnel app
const { app: vibeApp, wss: vibeWss } = createApp();

// Mount VibeTunnel routes
app.use('/api/vibe', vibeApp);

// Attach WebSocket server
httpServer.on('upgrade', (request, socket, head) => {
  if (request.url?.startsWith('/api/vibe/')) {
    vibeWss.handleUpgrade(request, socket, head, (ws) => {
      vibeWss.emit('connection', ws, request);
    });
  }
});

// Configure VibeTunnel port
configureVibeClient(port);
```

#### `/src/web/server/services/console.service.ts`
Session management service. Wraps VibeTunnel API with user isolation.

**Key Responsibilities:**
- Maintain in-memory session registry (Map<sessionId, SessionMetadata>)
- Create sessions via VibeTunnel API
- List sessions for a specific user
- Validate session ownership
- Destroy sessions
- Track session metadata (userId, name, directory, status, createdAt)

**Session Registry:**
```typescript
interface SessionMetadata {
  id: string;
  userId: string;
  name: string;
  customName?: string;
  createdAt: Date;
}

const sessions = new Map<string, SessionMetadata>();
```

**VibeTunnel API Client:**
```typescript
class VibeAPIClient {
  private baseUrl = 'http://localhost:PORT/api/vibe/api';

  async createSession(params): Promise<{ sessionId: string }> {
    // POST /api/vibe/api/sessions
    // Payload: { command: ['bash'], cwd, cols, rows }
  }

  async listSessions(): Promise<Array<{ id: string }>> {
    // GET /api/vibe/api/sessions
  }

  async deleteSession(sessionId): Promise<void> {
    // DELETE /api/vibe/api/sessions/:id
  }
}
```

#### `/src/web/server/routes/console.routes.ts`
REST API endpoints for session CRUD operations.

**Endpoints:**
- `GET /api/console/sessions` - List user's sessions
- `POST /api/console/sessions` - Create new session
- `GET /api/console/sessions/:id` - Get session details
- `DELETE /api/console/sessions/:id` - Destroy session
- `GET /api/console/sessions/:id/cwd` - Get current working directory
- `PATCH /api/console/sessions/:id/name` - Update custom name

**Authentication:**
All routes protected with existing auth middleware. User identified by IP address (authContext.user).

#### `/src/web/shared/types/console.ts`
TypeScript type definitions for console domain.

**Key Types:**
```typescript
export interface ConsoleSession {
  id: string;
  name: string;
  customName?: string;
  currentDirectory: string;
  createdAt: string;
  status: 'running' | 'stopped' | 'error';
  pid?: number;
}

export interface ConsoleTab {
  id: string;
  sessionId: string;
  name: string;
  customName?: string;
}

export interface CreateSessionRequest {
  name?: string;
  initialDirectory?: string;
}
```

---

### Frontend Components

#### `/src/web/client/pages/ConsolePage.tsx`
Main console page component. Manages tab state and session lifecycle.

**State Management:**
```typescript
const [tabs, setTabs] = useState<ConsoleTab[]>([]);
const [activeTabId, setActiveTabId] = useState<string>('');
const [isModalOpen, setIsModalOpen] = useState(false);
```

**Key Responsibilities:**
- Tab state management (create, select, close, rename)
- Session validation on mount
- Auto-save tabs to localStorage (debounced 500ms)
- Multi-tab browser synchronization (storage events)
- Session selection modal control

**Lifecycle:**
```typescript
// Effect 1: Hybrid validation on mount
useEffect(() => {
  if (sessionsData && !isInitialized) {
    // Load from localStorage
    // Validate against server sessions
    // Remove dead sessions
    // Restore active tab
  }
}, [sessionsData]);

// Effect 2: Auto-save tabs
useEffect(() => {
  if (!isInitialized) return;
  const timer = setTimeout(() => {
    saveTabsToStorage(USER_ID, tabs);
  }, 500);
  return () => clearTimeout(timer);
}, [tabs]);

// Effect 3: Sync across browser tabs
useEffect(() => {
  const handleStorageChange = (e) => {
    if (e.key?.includes('console_tabs')) {
      // Sync tab state from other browser tab
    }
  };
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

#### `/src/web/client/components/console/ConsoleHeader.tsx`
Page header with "New Session" button.

**Features:**
- Title: "Remote Console"
- Primary action button (Plus icon)
- onClick triggers session selection modal

#### `/src/web/client/components/console/ConsoleTabs.tsx`
Horizontal tab bar with rename functionality.

**Features:**
- Scrollable tab container
- Active tab highlighting
- Close button (×) for each tab
- Double-click to rename (inline input)
- Directory-based auto-naming with `useSessionDirectory` hook
- Custom name indicator (Pencil icon)
- Tooltip with full directory path

**Tab Naming Logic:**
```typescript
// TabItem sub-component
const { directory } = useSessionDirectory(tab.sessionId);

const displayName = tab.customName
  ? tab.customName
  : (directory ? getDirectoryName(directory) : tab.name);
```

#### `/src/web/client/components/console/ConsoleContent.tsx`
Terminal container component.

**States:**
- **No session**: Shows "Select a session" message with Terminal icon
- **Loading**: Shows "Connecting to terminal..." with animated icon
- **Active**: Renders VibeTerminal component

**Configuration:**
```typescript
<VibeTerminal
  sessionId={sessionId}
  cols={120}
  rows={30}
  fontSize={14}
  theme="dark"
  fitHorizontally={true}
  onTerminalReady={() => console.log('Terminal ready')}
  onTerminalInput={(input) => console.log('Input:', input)}
  onTerminalResize={(cols, rows) => console.log('Resize:', cols, rows)}
/>
```

#### `/src/web/client/components/console/VibeTerminal.tsx`
React wrapper for VibeTunnel's `<vibe-terminal>` Lit web component.

**Purpose:**
Bridge React lifecycle to Lit web component lifecycle.

**Implementation:**
```typescript
const VibeTerminal: React.FC<VibeTerminalProps> = (props) => {
  const terminalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    // Attach event listeners
    const handleReady = () => props.onTerminalReady?.();
    terminal.addEventListener('terminal-ready', handleReady);

    return () => {
      terminal.removeEventListener('terminal-ready', handleReady);
    };
  }, [props.onTerminalReady]);

  return (
    <vibe-terminal
      ref={terminalRef}
      session-id={props.sessionId}
      cols={props.cols}
      rows={props.rows}
      font-size={props.fontSize}
      theme={props.theme}
      fit-horizontally={props.fitHorizontally}
    />
  );
};
```

#### `/src/web/client/components/console/SessionSelectModal.tsx`
Modal for creating or selecting sessions.

**Layout:**
```
┌────────────────────────────────────────┐
│  Select Terminal Session         [×]   │
├────────────────────────────────────────┤
│  [+ Create New Session]                │
│  ─────────────────────────────────     │
│  Or connect to existing session        │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ SessionList                      │  │
│  │  - session-1 (running, ~/proj)  │  │
│  │  - session-2 (running, /tmp)    │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**Features:**
- Auto-refetch sessions when modal opens
- Create new session with API call
- Select existing session from list
- Loading and error states
- Toast notifications for success/error
- Prevents connecting to stopped/errored sessions

#### `/src/web/client/components/console/SessionList.tsx`
List of available sessions with metadata.

**Display:**
- Session name
- Status badge (color-coded: green=running, gray=stopped, red=error)
- Current directory (truncated with tooltip)
- Created timestamp (relative: "2 hours ago", "Just now")
- Process ID (PID)
- Empty state for no sessions

**Formatting:**
```typescript
const formatTimestamp = (timestamp: string) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
};
```

---

## API Reference

### Console REST API

Base URL: `/api/console`

#### `GET /sessions`
List all sessions for the authenticated user.

**Request:**
```http
GET /api/console/sessions HTTP/1.1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "sessions": [
    {
      "id": "144da932...",
      "name": "Terminal 1",
      "customName": "My Dev Environment",
      "currentDirectory": "/Users/user/project",
      "createdAt": "2025-10-20T12:00:00Z",
      "status": "running",
      "pid": 12345
    }
  ]
}
```

#### `POST /sessions`
Create a new terminal session.

**Request:**
```http
POST /api/console/sessions HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Session",
  "initialDirectory": "/Users/user/project"
}
```

**Response:**
```json
{
  "session": {
    "id": "144da932...",
    "name": "My Session",
    "currentDirectory": "/Users/user/project",
    "createdAt": "2025-10-20T12:00:00Z",
    "status": "running"
  }
}
```

#### `GET /sessions/:id`
Get details for a specific session.

**Request:**
```http
GET /api/console/sessions/144da932... HTTP/1.1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "session": {
    "id": "144da932...",
    "name": "My Session",
    "currentDirectory": "/Users/user/project",
    "createdAt": "2025-10-20T12:00:00Z",
    "status": "running",
    "pid": 12345
  }
}
```

#### `DELETE /sessions/:id`
Destroy a terminal session.

**Request:**
```http
DELETE /api/console/sessions/144da932... HTTP/1.1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true
}
```

#### `GET /sessions/:id/cwd`
Get current working directory for a session.

**Request:**
```http
GET /api/console/sessions/144da932.../cwd HTTP/1.1
Authorization: Bearer <token>
```

**Response:**
```json
{
  "sessionId": "144da932...",
  "cwd": "/Users/user/project/src"
}
```

#### `PATCH /sessions/:id/name`
Update custom name for a session.

**Request:**
```http
PATCH /api/console/sessions/144da932.../name HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Backend Development"
}
```

**Response:**
```json
{
  "success": true
}
```

### VibeTunnel API

Base URL: `/api/vibe/api` (proxied through console service)

VibeTunnel provides additional endpoints for direct PTY interaction:

- `GET /api/vibe/api/sessions` - List all VibeTunnel sessions
- `POST /api/vibe/api/sessions` - Create PTY session
- `DELETE /api/vibe/api/sessions/:id` - Destroy PTY session
- `POST /api/vibe/api/sessions/:id/input` - Send keyboard input (alternative to WebSocket)
- `GET /api/vibe/api/sessions/:id/buffer` - Get terminal buffer snapshot

**Note:** Console service wraps VibeTunnel API with user isolation. Direct VibeTunnel API usage bypasses user isolation.

---

## Session Management

### Session Lifecycle

```
┌─────────┐
│ Created │ (POST /api/console/sessions)
└────┬────┘
     │
     ▼
┌─────────┐
│ Running │ (PTY process active, WebSocket connected)
└────┬────┘
     │
     ├──→ User navigates away (WebSocket disconnects, PTY continues)
     │
     ├──→ Page refresh (Reconnects via hybrid validation)
     │
     └──→ User closes tab or DELETE request
          ↓
     ┌─────────┐
     │ Stopped │ (PTY process killed, WebSocket closed)
     └─────────┘
```

### User Isolation

Sessions are isolated by user IP address:

```typescript
// In console.service.ts
const sessionMetadata: SessionMetadata = {
  id: sessionId,
  userId: authContext.user, // IP address from auth middleware
  name: options.name || `Terminal ${Date.now()}`,
  createdAt: new Date(),
};

sessions.set(sessionId, sessionMetadata);
```

**Validation:**
```typescript
export function validateSessionOwnership(
  sessionId: string,
  userId: string
): boolean {
  const session = sessions.get(sessionId);
  return session?.userId === userId;
}
```

### Session Cleanup

**Automatic Cleanup:**
- Dead sessions removed on frontend validation (page load)
- PTY processes continue running until explicitly destroyed

**Manual Cleanup:**
```typescript
// Frontend: Close tab
handleCloseTab(tabId) {
  const tab = tabs.find(t => t.id === tabId);
  if (tab) {
    await destroySession(tab.sessionId); // DELETE request
  }
  setTabs(tabs.filter(t => t.id !== tabId));
}
```

**Recommended Production Cleanup:**
- Implement session timeout (e.g., 1 hour of inactivity)
- Max sessions per user (e.g., 10 concurrent sessions)
- Periodic cleanup of orphaned sessions

---

## Frontend Integration

### Hooks

#### `useConsoleSessions`
React Query hook for fetching and mutating sessions.

**Location:** `/src/web/client/hooks/useConsoleSessions.ts`

**API:**
```typescript
// Query hook
const { data, isLoading, error, refetch } = useConsoleSessions();

// Mutation hooks
const createMutation = useCreateSession();
const destroyMutation = useDestroySession();
const updateNameMutation = useUpdateSessionName();

// Usage
createMutation.mutate({ name: 'My Session' }, {
  onSuccess: (data) => {
    // Session created
  },
  onError: (error) => {
    // Handle error
  }
});
```

**Configuration:**
```typescript
export function useConsoleSessions() {
  return useQuery({
    queryKey: ['console-sessions'],
    queryFn: fetchSessions,
    staleTime: 30 * 1000, // 30 seconds
  });
}
```

#### `useSessionDirectory`
React Query hook for polling session current working directory.

**Location:** `/src/web/client/hooks/useSessionDirectory.ts`

**API:**
```typescript
const { directory, isLoading, error } = useSessionDirectory(sessionId);

// Returns:
// directory: string | undefined
// isLoading: boolean
// error: Error | null
```

**Configuration:**
```typescript
export function useSessionDirectory(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-directory', sessionId],
    queryFn: () => getSessionCwd(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 2000, // Poll every 2 seconds
    staleTime: 1000, // Consider stale after 1 second
  });
}
```

### Services

#### `console.service.ts`
API client for console endpoints.

**Location:** `/src/web/client/services/console.service.ts`

**API:**
```typescript
export async function fetchSessions(): Promise<ConsoleSession[]> {
  const response = await api.get<SessionListResponse>('/console/sessions');
  return response.data.sessions;
}

export async function createSession(
  options: CreateSessionRequest = {}
): Promise<ConsoleSession> {
  const response = await api.post<CreateSessionResponse>(
    '/console/sessions',
    options
  );
  return response.data.session;
}

export async function getSession(sessionId: string): Promise<ConsoleSession> {
  const response = await api.get<GetSessionResponse>(
    `/console/sessions/${sessionId}`
  );
  return response.data.session;
}

export async function destroySession(sessionId: string): Promise<void> {
  await api.delete(`/console/sessions/${sessionId}`);
}

export async function getSessionCwd(sessionId: string): Promise<string> {
  const response = await api.get<SessionCwdResponse>(
    `/console/sessions/${sessionId}/cwd`
  );
  return response.data.cwd;
}

export async function updateSessionName(
  sessionId: string,
  name: string
): Promise<void> {
  await api.patch(`/console/sessions/${sessionId}/name`, { name });
}
```

**Note:** Uses existing `api.service.ts` axios instance with auth token.

---

## VibeTunnel Integration

### Server Integration

**Location:** `/src/web/server/index.ts`

**Setup:**
```typescript
import { createApp } from 'vibetunnel';

// Disable VibeTunnel's built-in auth (we use our own)
process.argv.push('--no-auth');

// Create VibeTunnel app and WebSocket server
const { app: vibeApp, wss: vibeWss } = createApp();

// Mount VibeTunnel routes at /api/vibe/*
app.use('/api/vibe', vibeApp);

// Attach WebSocket server to HTTP server
const httpServer = http.createServer(app);
httpServer.on('upgrade', (request, socket, head) => {
  if (request.url?.startsWith('/api/vibe/')) {
    vibeWss.handleUpgrade(request, socket, head, (ws) => {
      vibeWss.emit('connection', ws, request);
    });
  }
});

// Configure VibeTunnel client with server port
configureVibeClient(port);
```

### Client Integration

**Location:** `/src/web/client/index.html`

**Asset Loading:**
```html
<!-- VibeTunnel client bundle (Lit + xterm.js + terminal components) -->
<script type="module" src="/vibetunnel/client-bundle.js"></script>

<!-- VibeTunnel styles (terminal themes + UI) -->
<link href="/vibetunnel/styles.css" rel="stylesheet" />
```

**Assets:**
- `/src/web/client/public/vibetunnel/client-bundle.js` (848 KB)
- `/src/web/client/public/vibetunnel/styles.css` (159 KB)

**Web Component Usage:**
```tsx
// In React component
<vibe-terminal
  session-id="144da932..."
  cols="120"
  rows="30"
  font-size="14"
  theme="dark"
  fit-horizontally="true"
/>
```

### Type Definitions

**Location:** `/src/web/client/types/vibetunnel.d.ts`

**TypeScript Declarations:**
```typescript
declare namespace JSX {
  interface IntrinsicElements {
    'vibe-terminal': VibeTerminalElement;
    'session-view': SessionViewElement;
    'session-list': SessionListElement;
  }
}

interface VibeTerminalElement extends React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> {
  'session-id'?: string;
  cols?: number;
  rows?: number;
  'font-size'?: number;
  theme?: 'dark' | 'light';
  'fit-horizontally'?: boolean;
  'max-cols'?: number;
  'on-terminal-ready'?: (event: CustomEvent) => void;
  'on-terminal-input'?: (event: CustomEvent<string>) => void;
  'on-terminal-resize'?: (event: CustomEvent<{ cols: number; rows: number }>) => void;
}
```

---

## State Management

### Tab State

**Structure:**
```typescript
interface ConsoleTab {
  id: string;          // Unique tab ID (tab-{timestamp}-{random})
  sessionId: string;   // VibeTunnel session ID
  name: string;        // Display name (directory or custom)
  customName?: string; // User-provided custom name
}

// State
const [tabs, setTabs] = useState<ConsoleTab[]>([]);
const [activeTabId, setActiveTabId] = useState<string>('');
```

### Tab Operations

**Create Tab:**
```typescript
function handleSessionSelected(session: ConsoleSession) {
  const newTab: ConsoleTab = {
    id: `tab-${Date.now()}-${Math.random()}`,
    sessionId: session.id,
    name: session.name,
  };
  setTabs([...tabs, newTab]);
  setActiveTabId(newTab.id);
  setIsModalOpen(false);
}
```

**Rename Tab:**
```typescript
function handleRenameTab(tabId: string, newName: string) {
  setTabs(tabs.map(tab =>
    tab.id === tabId
      ? { ...tab, customName: newName }
      : tab
  ));
}
```

**Close Tab:**
```typescript
async function handleCloseTab(tabId: string) {
  const tab = tabs.find(t => t.id === tabId);

  // Destroy session on server
  if (tab) {
    await destroySession(tab.sessionId);
  }

  // Remove tab
  const remainingTabs = tabs.filter(t => t.id !== tabId);
  setTabs(remainingTabs);

  // Adjust active tab
  if (activeTabId === tabId && remainingTabs.length > 0) {
    setActiveTabId(remainingTabs[0].id);
  }
}
```

**Switch Tab:**
```typescript
function handleSelectTab(tabId: string) {
  setActiveTabId(tabId);
}
```

---

## Persistence Layer

### Storage Strategy

**Hybrid Approach:**
- **localStorage**: Fast page loads, client-side tab state
- **Server Validation**: Truth source for session existence

**Storage Key:**
```typescript
const USER_ID = 'current_user'; // TODO: Replace with actual user ID
const storageKey = `console_tabs_${hashString(USER_ID)}`;
```

### Persistence Implementation

**Location:** `/src/web/client/utils/consolePersistence.ts`

**Save Tabs:**
```typescript
export function saveTabsToStorage(userId: string, tabs: ConsoleTab[]): void {
  try {
    const key = `console_tabs_${hashString(userId)}`;
    localStorage.setItem(key, JSON.stringify(tabs));
  } catch (error) {
    console.error('Failed to save tabs to localStorage:', error);
  }
}
```

**Load Tabs:**
```typescript
export function loadTabsFromStorage(userId: string): ConsoleTab[] {
  try {
    const key = `console_tabs_${hashString(userId)}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load tabs from localStorage:', error);
    return [];
  }
}
```

**Clear Tabs:**
```typescript
export function clearTabsFromStorage(userId: string): void {
  const key = `console_tabs_${hashString(userId)}`;
  localStorage.removeItem(key);
}
```

**Watch Storage (Multi-Tab Sync):**
```typescript
export function watchTabsInOtherTabs(
  userId: string,
  callback: (tabs: ConsoleTab[]) => void
): () => void {
  const key = `console_tabs_${hashString(userId)}`;

  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === key && event.newValue) {
      const tabs = JSON.parse(event.newValue);
      callback(tabs);
    }
  };

  window.addEventListener('storage', handleStorageChange);

  return () => window.removeEventListener('storage', handleStorageChange);
}
```

### Validation Flow

```typescript
// In ConsolePage.tsx
useEffect(() => {
  if (!sessionsData || isInitialized) return;

  // 1. Load tabs from localStorage
  const savedTabs = loadTabsFromStorage(USER_ID);

  // 2. Fetch active sessions from server
  const activeSessions = sessionsData.sessions;
  const activeSessionIds = new Set(activeSessions.map(s => s.id));

  // 3. Validate tabs against active sessions
  const validTabs = savedTabs.filter(tab =>
    activeSessionIds.has(tab.sessionId)
  );

  // 4. Update state
  setTabs(validTabs);

  // 5. Restore active tab (or select first)
  const savedActiveTab = localStorage.getItem('active_tab_id');
  if (savedActiveTab && validTabs.some(t => t.id === savedActiveTab)) {
    setActiveTabId(savedActiveTab);
  } else if (validTabs.length > 0) {
    setActiveTabId(validTabs[0].id);
  }

  setIsInitialized(true);
}, [sessionsData]);
```

---

## WebSocket Protocol

### Connection URL

**Format:**
```
ws://localhost:3000/api/vibe/ws/buffer?sessionId=144da932...&token=AUTH_TOKEN
```

**WebSocket Endpoints:**
- `/api/vibe/ws/buffer?sessionId=X&token=Y` - Terminal output (binary)
- `/api/vibe/ws/input?sessionId=X&token=Y` - Keyboard input (text)
- `/api/vibe/ws/control?token=Y` - Control messages (JSON)

### Binary Protocol

VibeTunnel uses a binary WebSocket protocol for efficiency:

**Output Stream (buffer):**
```
Magic Byte: 0xBF
Payload: Binary delta updates (only changed cells)
```

**Input Stream:**
```
Text payload: Keyboard input as string
Fire-and-forget: No acknowledgment required
```

**Bandwidth Savings:**
- Binary protocol: 99.5% less bandwidth than text
- Delta updates: Only changed cells sent
- Typical usage: 1-5 KB/s during active use

### Connection Lifecycle

```
Terminal Component Mounted
  → VibeTunnel client establishes WebSocket connection
  → Server validates sessionId
  → Connection established
  → Initial buffer snapshot sent
  → Terminal ready

User Types
  → Input sent via WebSocket (text)
  → PTY executes command
  → Output captured
  → Delta computed
  → Delta sent via WebSocket (binary)
  → Terminal updated

Tab Switch
  → Previous WebSocket connection closed
  → New WebSocket connection established for active tab
  → Buffer snapshot sent
  → Terminal synced

Page Refresh
  → All WebSocket connections closed
  → Page reloads
  → Tabs restored from localStorage
  → Active tab WebSocket reconnects
  → Terminal resumes
```

---

## Security

### Authentication

**Token-Based Auth:**
```typescript
// Auth middleware validates token
export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token || token !== SERVER_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // User identified by IP address
  req.authContext = {
    user: req.ip,
    authenticated: true,
  };

  next();
}
```

**All console endpoints protected:**
```typescript
router.get('/sessions', authMiddleware, async (req, res) => {
  // Only accessible with valid token
});
```

### Session Isolation

**User Ownership Validation:**
```typescript
// Every session operation validates ownership
const session = sessions.get(sessionId);
if (!session || session.userId !== req.authContext.user) {
  return res.status(403).json({ error: 'Access denied' });
}
```

**Prevents:**
- Cross-user session access
- Session hijacking
- Unauthorized session control

### Terminal Access Risks

**⚠️ CRITICAL SECURITY CONSIDERATIONS:**

1. **Full Shell Access**: PTY provides unrestricted shell access
2. **Server Permissions**: Commands execute with Node.js process user
3. **No Command Filtering**: All commands allowed (no sandboxing)
4. **File System Access**: Full read/write to server filesystem
5. **Network Access**: Can make outbound connections

**Mitigation Strategies:**

1. **Run as Non-Root User:**
```bash
# Create dedicated user
sudo useradd -m -s /bin/bash ccdevtools

# Run server as that user
sudo -u ccdevtools node dist/web/server/index.js
```

2. **Use Docker/Containers:**
```dockerfile
FROM node:18-alpine
USER node
WORKDIR /app
CMD ["node", "dist/web/server/index.js"]
```

3. **Network Isolation:**
```bash
# Firewall rules to limit outbound connections
sudo ufw deny out from <server-ip> to any
sudo ufw allow out from <server-ip> to <allowed-destinations>
```

4. **Monitor & Audit:**
- Log all session creation/destruction
- Alert on suspicious commands
- Track resource usage (CPU, memory, processes)

5. **Access Control:**
- Restrict console access to administrators only
- Implement RBAC for user roles
- Regular access reviews

### Input Sanitization

**Custom Tab Names:**
```typescript
// Sanitize user input to prevent XSS
function sanitizeTabName(name: string): string {
  return name
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .slice(0, 50); // Limit length
}
```

**Session IDs:**
```typescript
// Validate session ID format
function validateSessionId(id: string): boolean {
  return /^[a-f0-9]{8,64}$/.test(id);
}
```

---

## Performance

### Metrics

**Per Terminal Session:**
- Memory: ~5-10 MB (PTY process + buffer)
- CPU: <1% idle, spikes during command execution
- Network: 1-5 KB/s active use, <100 bytes/s idle

**VibeTunnel Efficiency:**
- Binary protocol: 99.5% bandwidth reduction vs text
- Delta updates: Only changed cells transmitted
- Buffer aggregation: Batches updates for efficiency

### Optimization Techniques

**1. Lazy Loading:**
```tsx
// ConsolePage lazy-loaded
const ConsolePage = lazy(() => import('./pages/ConsolePage'));

<Suspense fallback={<LoadingSpinner />}>
  <ConsolePage />
</Suspense>
```

**2. React Query Caching:**
```typescript
// Sessions cached for 30 seconds
const { data } = useConsoleSessions(); // staleTime: 30s

// Directory polling only for active tab
const { directory } = useSessionDirectory(
  activeTab?.sessionId // Conditional polling
);
```

**3. Debounced Saves:**
```typescript
// Save tabs to localStorage 500ms after changes
useEffect(() => {
  const timer = setTimeout(() => {
    saveTabsToStorage(USER_ID, tabs);
  }, 500);
  return () => clearTimeout(timer);
}, [tabs]);
```

**4. WebSocket Efficiency:**
- Binary protocol reduces payload size
- Delta updates minimize data transfer
- Connection pooling (one per active session)

**5. Bundle Optimization:**
```typescript
// Production build
npm run build:web

// Results:
// ConsolePage: 12.59 KB (4.54 KB gzipped)
// VibeTunnel assets: Pre-built, served statically
```

### Scaling Recommendations

**Small Scale (<10 users):**
- Single Node.js instance
- 2 CPU, 4 GB RAM sufficient

**Medium Scale (10-50 users):**
- Horizontal scaling with load balancer
- Sticky sessions (WebSocket requirement)
- Session limit per user (e.g., 5)

**Large Scale (50+ users):**
- Dedicated VibeTunnel server cluster
- Redis for session state sharing
- Auto-cleanup of idle sessions (>1 hour)
- Rate limiting on session creation

---

## Development Guide

### Project Structure

```
src/web/
├── client/                          # Frontend (React)
│   ├── pages/
│   │   └── ConsolePage.tsx         # Main console page
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx       # Layout with sidebar
│   │   │   └── Sidebar.tsx         # Navigation sidebar
│   │   └── console/
│   │       ├── ConsoleHeader.tsx   # Page header
│   │       ├── ConsoleTabs.tsx     # Tab bar
│   │       ├── ConsoleContent.tsx  # Terminal container
│   │       ├── VibeTerminal.tsx    # React wrapper
│   │       ├── SessionSelectModal.tsx
│   │       └── SessionList.tsx
│   ├── services/
│   │   └── console.service.ts      # API client
│   ├── hooks/
│   │   ├── useConsoleSessions.ts   # React Query hooks
│   │   └── useSessionDirectory.ts  # Directory polling
│   ├── utils/
│   │   └── consolePersistence.ts   # localStorage
│   ├── types/
│   │   └── vibetunnel.d.ts         # Type definitions
│   └── public/
│       └── vibetunnel/
│           ├── client-bundle.js    # VibeTunnel client
│           └── styles.css          # Terminal styles
├── server/                          # Backend (Express)
│   ├── index.ts                    # Server entry point
│   ├── routes/
│   │   ├── index.ts                # Route mounting
│   │   └── console.routes.ts       # Console endpoints
│   └── services/
│       └── console.service.ts      # Session management
└── shared/
    └── types/
        └── console.ts              # Shared TypeScript types
```

### Development Workflow

**1. Start Development Servers:**
```bash
# Terminal 1: TypeScript watch mode
npm run dev

# Terminal 2: Backend server
node dist/web/server/index.js

# Terminal 3: Frontend dev server
npm run dev:web
```

**2. Access Application:**
- Frontend: http://localhost:5173/
- Backend API: http://localhost:9101/
- Auth token: Check backend logs

**3. Make Changes:**
- TypeScript auto-compiles (Terminal 1)
- Frontend hot-reloads (Terminal 3)
- Backend requires manual restart

**4. Run Quality Checks:**
```bash
npm run typecheck  # TypeScript validation
npm run lint       # ESLint
npm run build:web  # Production build test
```

### Adding Features

**New Console Component:**
```bash
# 1. Create component
touch src/web/client/components/console/MyComponent.tsx

# 2. Write component
# - Use TypeScript with proper types
# - Import from shared types
# - Follow existing patterns

# 3. Import in parent component
import MyComponent from '../components/console/MyComponent';

# 4. Run typecheck
npm run typecheck
```

**New API Endpoint:**
```bash
# 1. Add type to console.ts
# src/web/shared/types/console.ts
export interface MyRequest { ... }

# 2. Add route handler
# src/web/server/routes/console.routes.ts
router.post('/my-endpoint', authMiddleware, async (req, res) => {
  // Implementation
});

# 3. Add service function
# src/web/server/services/console.service.ts
export async function myFunction() { ... }

# 4. Add client function
# src/web/client/services/console.service.ts
export async function callMyEndpoint() { ... }

# 5. Test with curl
curl -X POST http://localhost:9101/api/console/my-endpoint \
  -H "Authorization: Bearer <token>"
```

### Testing

**Manual Testing:**
```bash
# 1. Start servers (see Development Workflow)

# 2. Test in browser
- Open http://localhost:5173/
- Login with token
- Navigate to Console
- Create sessions, test tabs, etc.

# 3. Check browser console for errors

# 4. Monitor backend logs
# Watch Terminal 2 for API requests/errors
```

**API Testing:**
```bash
# Get sessions
curl http://localhost:9101/api/console/sessions \
  -H "Authorization: Bearer <token>"

# Create session
curl -X POST http://localhost:9101/api/console/sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Session"}'

# Get session directory
curl http://localhost:9101/api/console/sessions/<id>/cwd \
  -H "Authorization: Bearer <token>"
```

---

## Troubleshooting

### Common Issues

#### Terminal Not Rendering

**Symptoms:** Blank screen, "Connecting..." stuck

**Causes:**
- VibeTunnel not mounted
- WebSocket connection failed
- Session ID invalid

**Solutions:**
```bash
# 1. Check backend logs for VibeTunnel mount errors
grep -i "vibetunnel" server.log

# 2. Verify WebSocket URL in browser DevTools Network tab
# Should see: ws://localhost:3000/api/vibe/ws/buffer?sessionId=...

# 3. Check VibeTunnel base URL configuration
# src/web/server/services/console.service.ts
# baseUrl should be: http://localhost:{PORT}/api/vibe/api
```

#### Session Creation Fails

**Symptoms:** "Failed to create session" error toast

**Causes:**
- VibeTunnel server not responding
- PTY spawn failure
- Port conflict

**Solutions:**
```bash
# 1. Check VibeTunnel is running
lsof -i :9101 # Server port

# 2. Check backend logs for errors
tail -f server.log | grep -i error

# 3. Verify VibeTunnel --no-auth flag
# src/web/server/index.ts
# process.argv.push('--no-auth');

# 4. Test VibeTunnel API directly
curl http://localhost:9101/api/vibe/api/sessions
```

#### Tabs Don't Persist

**Symptoms:** Tabs disappear after page refresh

**Causes:**
- localStorage blocked
- Session validation failing
- Storage key mismatch

**Solutions:**
```bash
# 1. Check browser localStorage in DevTools
# Application → Local Storage → http://localhost:5173
# Look for: console_tabs_{hash}

# 2. Verify session list API works
curl http://localhost:9101/api/console/sessions \
  -H "Authorization: Bearer <token>"

# 3. Check console for validation errors
# Browser console: Look for "Failed to validate sessions"

# 4. Clear localStorage and retry
localStorage.clear(); // In browser console
```

#### Directory Auto-Naming Not Updating

**Symptoms:** Tab name doesn't change after `cd`

**Causes:**
- Polling disabled
- API endpoint failing
- React Query cache stale

**Solutions:**
```bash
# 1. Verify cwd endpoint works
curl http://localhost:9101/api/console/sessions/<id>/cwd \
  -H "Authorization: Bearer <token>"

# 2. Check Network tab for polling requests
# Should see requests every 2 seconds when tab active

# 3. Verify session ID is valid
console.log('Session ID:', activeTab?.sessionId);

# 4. Check if custom name is overriding
# Custom names take precedence over auto-naming
```

#### High Memory Usage

**Symptoms:** Server memory grows over time

**Causes:**
- Too many active sessions
- Memory leaks in PTY processes
- Orphaned sessions not cleaned up

**Solutions:**
```bash
# 1. Check active sessions
curl http://localhost:9101/api/console/sessions \
  -H "Authorization: Bearer <token>"

# 2. Check PTY process count
ps aux | grep -E "bash|zsh|sh" | wc -l

# 3. Implement cleanup
# Add session timeout (1 hour)
# Add max sessions per user (5)
# Periodic cleanup of orphaned sessions

# 4. Monitor memory
# Add logging in console.service.ts:
console.log('Active sessions:', sessions.size);
```

### Debug Mode

**Enable Detailed Logging:**
```typescript
// src/web/server/services/console.service.ts
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('[Console] Creating session:', options);
  console.log('[Console] Active sessions:', sessions.size);
}
```

**Run with Debug:**
```bash
DEBUG=true node dist/web/server/index.js
```

**Frontend Debug:**
```typescript
// src/web/client/pages/ConsolePage.tsx
console.log('[ConsolePage] Tabs:', tabs);
console.log('[ConsolePage] Active tab:', activeTabId);
console.log('[ConsolePage] Sessions:', sessionsData);
```

---

## Additional Resources

- **Implementation Plan**: [vibetunnel_implementation.md](/Users/shaenchen/Projects/cc-devtools/vibetunnel_implementation.md)
- **Deployment Guide**: [CONSOLE_DEPLOYMENT.md](/Users/shaenchen/Projects/cc-devtools/CONSOLE_DEPLOYMENT.md)
- **VibeTunnel Integration**: [VIBETUNNEL_INTEGRATION_GUIDE.md](/Users/shaenchen/Projects/cc-devtools/VIBETUNNEL_INTEGRATION_GUIDE.md)
- **VibeTunnel Summary**: [VIBETUNNEL_SUMMARY.md](/Users/shaenchen/Projects/cc-devtools/VIBETUNNEL_SUMMARY.md)

---

**Last Updated:** 2025-10-20
**Maintainer:** Shaen Chen
**Status:** Production Ready (pending user testing)
