# Per-File Runner Web UI Proposal

## Executive Summary

This proposal outlines adding web UI capabilities for the per-file-runner feature, following your existing design patterns and architecture. The UI will enable config management, status monitoring, and execution triggers through a familiar interface matching your kanban, memory, and plans pages.

## Current Architecture Analysis

### Frontend Patterns Observed

**Page Structure:**
- All pages follow similar layout: `AppLayout` wrapper with sidebar navigation
- Pages use consistent hooks: `useQuery` (react-query), `useDebounce`, state management
- Search bars with debounced input and cursor position preservation
- Virtualized lists for performance (Memory and Plans pages)
- Context menus (right-click/long-press) for actions

**Component Patterns:**
- Shared components: `Button`, `SearchBar`, `Select`, `LoadingSpinner`, `ErrorMessage`
- Card-based designs with expand/collapse functionality
- Status badges with color coding
- Modal dialogs for destructive actions (DeleteMemoryModal, DeletePlanModal)
- Form components with validation

**Data Flow:**
- Backend API routes in `src/web/server/routes/`
- Frontend services in `src/web/client/services/`
- React Query for data fetching and caching
- SSE (Server-Sent Events) for real-time updates

**Styling:**
- Tailwind CSS with dark mode support
- Neutral color palette with primary accent colors
- Responsive design with mobile considerations

### Sidebar Navigation

Current navigation items:
- Kanban
- Plans
- Memory
- Editor
- Console

**Proposal:** Add "File Runner" between Memory and Editor (icon: `PlayCircle` or `RefreshCw` from lucide-react)

## Proposed UI Design

### Page: File Runner Dashboard

**Route:** `/file-runner`

**Layout:** Similar to Plans/Memory explorer with 3 main sections:

```
┌─────────────────────────────────────────────────────────┐
│  File Runner                               [+ New Config] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Config List (Left/Top)                                  │
│  ┌──────────────────────────────────┐                   │
│  │ [Run] add-docs (Priority 1)      │ ← Card            │
│  │ Status: 15 new, 3 out-of-date   │                   │
│  │ Last run: 2 hours ago            │                   │
│  │ ⋮ [Edit] [Delete] [Dry Run]     │ ← Actions         │
│  └──────────────────────────────────┘                   │
│                                                           │
│  │ [Run] fix-lint (Priority 2)      │                   │
│  │ Status: All up-to-date           │                   │
│  │ Last run: 5 minutes ago          │                   │
│  │ ⋮ [Edit] [Delete] [Dry Run]     │                   │
│  └──────────────────────────────────┘                   │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Selected Config Details (Right/Bottom)                  │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Config: add-docs                                     ││
│  │                                                       ││
│  │ Prompt: Add JSDoc comments to {filename}...         ││
│  │                                                       ││
│  │ Command: claude -p "___PROMPT___"                   ││
│  │                                                       ││
│  │ Glob:                                                ││
│  │   Include: src/**/*.ts                              ││
│  │   Exclude: **/*.test.ts                             ││
│  │                                                       ││
│  │ File Status (226 files):                            ││
│  │   ✓ 208 up-to-date                                  ││
│  │   ⚠ 3 out-of-date                                   ││
│  │   ● 15 new                                          ││
│  │                                                       ││
│  │   [View Files] [Run Now] [Dry Run]                 ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Config List (Main View)

**ConfigCard Component:**
```tsx
interface ConfigCardProps {
  config: PerFileRunnerConfig;
  status: ConfigStatus;
  onRun: (configId: string) => void;
  onEdit: (configId: string) => void;
  onDelete: (configId: string) => void;
  onDryRun: (configId: string) => void;
  onSelect: (configId: string) => void;
  isSelected: boolean;
}
```

**Features:**
- Displays: name, priority badge, status summary, last run timestamp
- Color-coded status indicators:
  - Green badge: All up-to-date
  - Yellow badge: Has out-of-date files
  - Blue badge: Has new files
  - Red badge: Last run failed
- Context menu (right-click/long-press) with actions
- Click to expand and show details
- Quick action buttons when expanded

**Status Summary Format:**
```
✓ All up-to-date (226 files)
⚠ 3 out-of-date, 15 new (226 total)
● 18 need processing (226 total)
✗ Failed on src/utils.ts
```

#### 2. Config Details Panel

Appears when a config is selected (similar to Memory/Plans detail view).

**Sections:**
1. **Configuration Overview**
   - ID, Name, Priority
   - Prompt template (expandable)
   - Command and arguments
   - Timeout setting

2. **Glob Patterns**
   - Include patterns (list)
   - Exclude patterns (list)
   - Files matched count

3. **File Status**
   - Summary counts with color coding
   - Expandable list showing actual files by status
   - Grouped: New → Out-of-date → Up-to-date

4. **Actions**
   - Primary: `Run Now` button (green, prominent)
   - Secondary: `Dry Run` button (blue)
   - Tertiary: `View Logs`, `Reset State`

5. **Last Run Info**
   - Timestamp
   - Duration
   - Files processed
   - Success/failure status
   - Error message (if failed)

#### 3. Config Form (Create/Edit Modal)

**Modal Dialog (similar to StoryForm/SubtaskForm):**

**Tabs:**
- **Basic Info:** ID, Name, Priority
- **Prompt:** Multiline text editor with `{filename}` placeholder help
- **Command:** Command input, args array input
- **Files:** Glob include/exclude patterns
- **Settings:** Timeout

**Form Validation:**
- Required: id, name, prompt, command
- ID uniqueness check
- Prompt must contain `{filename}`
- Args must contain `___PROMPT___`
- Glob include must have at least 1 pattern

**Preview Section:**
- Shows example of what command would look like with sample file

#### 4. File List Modal

Shows detailed file list for a config when "View Files" clicked.

**Features:**
- Grouped by status (collapsible sections)
- Search/filter files
- Shows file path and last hash
- Actions: Reset individual file state

#### 5. Run Progress Dialog

Appears during execution (similar to loading states in other pages).

**Features:**
- Real-time progress updates
- Current file being processed
- Files processed / total
- Success/failure indicators
- Cancel button (sends SIGTERM to process)
- Streaming logs (optional, expandable section)

#### 6. Automatic Mode Dashboard

Special view when automatic mode is running.

**Features:**
- Shows current status: Running, Waiting, Paused
- Next run countdown timer
- Run history timeline
- Stop/Pause controls

### Action Buttons

**Global Actions (Top Right):**
- `+ New Config` - Opens config creation modal
- `Run All` - Runs all configs in priority order
- `Automatic Mode` - Toggle automatic mode

**Per-Config Actions:**
- `Run` - Run this config now
- `Dry Run` - Preview what would run
- `Edit` - Edit configuration
- `Delete` - Delete config (with confirmation)
- `Reset` - Reset all file state
- `View Logs` - Show execution history

## API Endpoints

### Backend Routes (`src/web/server/routes/per-file-runner.routes.ts`)

```typescript
// GET /api/per-file-runner/configs
// Returns: Array<PerFileRunnerConfig>

// GET /api/per-file-runner/configs/:id
// Returns: PerFileRunnerConfig

// POST /api/per-file-runner/configs
// Body: PerFileRunnerConfig
// Returns: { success: boolean }

// PUT /api/per-file-runner/configs/:id
// Body: Partial<PerFileRunnerConfig>
// Returns: { success: boolean }

// DELETE /api/per-file-runner/configs/:id
// Returns: { success: boolean }

// GET /api/per-file-runner/status/:id
// Returns: { config: PerFileRunnerConfig, files: FileState[], summary: StatusSummary }

// GET /api/per-file-runner/status
// Returns: Array<{ config: PerFileRunnerConfig, summary: StatusSummary }>

// POST /api/per-file-runner/run/:id
// Body: { dryRun?: boolean }
// Returns: Stream (SSE) of execution progress

// POST /api/per-file-runner/run-all
// Body: { dryRun?: boolean }
// Returns: Stream (SSE) of execution progress

// POST /api/per-file-runner/reset/:id
// Returns: { success: boolean }

// POST /api/per-file-runner/reset-file/:id
// Body: { file: string }
// Returns: { success: boolean }

// GET /api/per-file-runner/automatic/status
// Returns: { running: boolean, nextRun: timestamp, state: string }

// POST /api/per-file-runner/automatic/start
// Returns: { success: boolean }

// POST /api/per-file-runner/automatic/stop
// Returns: { success: boolean }
```

### Frontend Service (`src/web/client/services/per-file-runner.service.ts`)

```typescript
export const perFileRunnerService = {
  // Config management
  fetchConfigs(): Promise<PerFileRunnerConfig[]>
  fetchConfig(id: string): Promise<PerFileRunnerConfig>
  createConfig(config: PerFileRunnerConfig): Promise<void>
  updateConfig(id: string, config: Partial<PerFileRunnerConfig>): Promise<void>
  deleteConfig(id: string): Promise<void>

  // Status
  fetchStatus(id: string): Promise<ConfigStatusResponse>
  fetchAllStatuses(): Promise<ConfigStatusSummary[]>

  // Execution
  runConfig(id: string, dryRun?: boolean): EventSource
  runAll(dryRun?: boolean): EventSource
  resetConfig(id: string): Promise<void>
  resetFile(id: string, file: string): Promise<void>

  // Automatic mode
  getAutomaticStatus(): Promise<AutomaticStatus>
  startAutomatic(): Promise<void>
  stopAutomatic(): Promise<void>
}
```

## State Management

### Zustand Store (`src/web/client/stores/perFileRunnerStore.ts`)

```typescript
interface PerFileRunnerStore {
  // Selected config
  selectedConfigId: string | null;
  setSelectedConfigId: (id: string | null) => void;

  // Execution state
  runningConfigs: Set<string>;
  setRunningConfig: (id: string, running: boolean) => void;

  // Automatic mode
  automaticMode: {
    running: boolean;
    nextRun: number | null;
    state: 'idle' | 'running' | 'waiting' | 'error';
  };
  setAutomaticMode: (mode: typeof state.automaticMode) => void;

  // Expanded configs (for UI state)
  expandedConfigs: Set<string>;
  toggleExpanded: (id: string) => void;
}
```

## Implementation Plan

### Phase 1: Backend API (Priority 1)

**Tasks:**
1. Create `/api/per-file-runner` routes
2. Implement config CRUD operations
3. Implement status endpoints
4. Implement run endpoints with SSE streaming
5. Implement reset endpoints
6. Add automatic mode endpoints

**Estimated Time:** 4-6 hours

**Files to Create/Modify:**
- `src/web/server/routes/per-file-runner.routes.ts` (new)
- `src/web/server/index.ts` (add route)
- `src/web/shared/types/per-file-runner.ts` (new, shared types)

### Phase 2: Frontend Services & Hooks (Priority 2)

**Tasks:**
1. Create service layer
2. Create React Query hooks
3. Implement SSE event handling for run streams

**Estimated Time:** 2-3 hours

**Files to Create:**
- `src/web/client/services/per-file-runner.service.ts`
- `src/web/client/hooks/usePerFileRunner.ts`

### Phase 3: Core Components (Priority 3)

**Tasks:**
1. ConfigCard component
2. ConfigDetailsPanel component
3. StatusBadge component
4. FileListModal component

**Estimated Time:** 4-5 hours

**Files to Create:**
- `src/web/client/components/per-file-runner/ConfigCard.tsx`
- `src/web/client/components/per-file-runner/ConfigDetailsPanel.tsx`
- `src/web/client/components/per-file-runner/StatusBadge.tsx`
- `src/web/client/components/per-file-runner/FileListModal.tsx`

### Phase 4: Forms (Priority 4)

**Tasks:**
1. ConfigForm modal component
2. Form validation
3. Preview functionality

**Estimated Time:** 3-4 hours

**Files to Create:**
- `src/web/client/components/per-file-runner/ConfigForm.tsx`
- `src/web/client/components/per-file-runner/ConfigFormPreview.tsx`

### Phase 5: Main Page (Priority 5)

**Tasks:**
1. FileRunnerPage component
2. Layout and responsive design
3. State management integration
4. Context menus
5. Keyboard shortcuts

**Estimated Time:** 4-5 hours

**Files to Create:**
- `src/web/client/pages/FileRunnerPage.tsx`
- `src/web/client/stores/perFileRunnerStore.ts`

### Phase 6: Execution UI (Priority 6)

**Tasks:**
1. RunProgressModal component
2. SSE progress streaming
3. Real-time updates
4. Error handling

**Estimated Time:** 3-4 hours

**Files to Create:**
- `src/web/client/components/per-file-runner/RunProgressModal.tsx`
- `src/web/client/components/per-file-runner/ExecutionLogs.tsx`

### Phase 7: Automatic Mode (Priority 7)

**Tasks:**
1. AutomaticModePanel component
2. Status polling
3. Start/Stop controls
4. Run history timeline

**Estimated Time:** 3-4 hours

**Files to Create:**
- `src/web/client/components/per-file-runner/AutomaticModePanel.tsx`
- `src/web/client/components/per-file-runner/RunHistory.tsx`

### Phase 8: Polish & Testing (Priority 8)

**Tasks:**
1. Mobile responsive design
2. Dark mode verification
3. Loading states
4. Error boundaries
5. E2E testing
6. Documentation

**Estimated Time:** 2-3 hours

## Total Estimated Time: 25-34 hours

## Key Decisions Needed

### 1. **Layout Preference**

**Option A:** Split view (like current proposal)
- Left: Config list
- Right: Selected config details
- Pros: See multiple configs at once, familiar pattern
- Cons: Less space for details on smaller screens

**Option B:** Tab-based view
- Tabs for each config
- Full width for details
- Pros: More space for details, simpler mobile layout
- Cons: Can only see one config at a time

**Option C:** Single list with expandable cards
- Configs as cards that expand in-place
- Similar to accordion
- Pros: Very simple, mobile-friendly
- Cons: Need to collapse one to open another

**My suggestion:** Option A (split view) - matches your Memory/Plans pages

### 2. **Execution Feedback**

**Option A:** Modal with progress
- Blocking modal shows progress
- User waits until complete
- Pros: Clear feedback, prevents concurrent runs
- Cons: Blocks UI

**Option B:** Toast notifications
- Toast shows when run starts/completes
- Can navigate away
- Pros: Non-blocking, flexible
- Cons: Less visibility into progress

**Option C:** Status panel at bottom
- Fixed panel at page bottom shows progress
- Collapsible
- Pros: Visible but not blocking
- Cons: Takes screen space

**My suggestion:** Option C (status panel) - best UX balance

### 3. **Real-time Updates**

**Option A:** SSE for run progress only
- Only stream progress during active runs
- Pros: Simple, efficient
- Cons: Status not real-time between runs

**Option B:** SSE for all state changes
- Stream file changes, config updates
- Pros: Always up-to-date
- Cons: More complex, more server load

**My suggestion:** Option A - matches your current SSE usage patterns

### 4. **Automatic Mode UI**

**Option A:** Separate page/tab
- Dedicated page for automatic mode
- Full control panel
- Pros: Dedicated space, clear separation
- Cons: Extra navigation

**Option B:** Panel on main page
- Collapsible panel on FileRunnerPage
- Shows when automatic mode active
- Pros: Integrated, no navigation needed
- Cons: Takes space when active

**Option C:** Status indicator only
- Just show status badge
- Click opens modal for details
- Pros: Minimal space usage
- Cons: Less visible

**My suggestion:** Option B (panel) - visible but not intrusive

### 5. **Config Priority Management**

**Option A:** Drag-and-drop reordering
- Drag configs to reorder priority
- Visual and intuitive
- Pros: Great UX
- Cons: More complex to implement

**Option B:** Number input per config
- Edit priority number directly
- Simple form input
- Pros: Simple, precise
- Cons: Less intuitive

**Option C:** Up/down arrows
- Buttons to move up/down
- Standard pattern
- Pros: Clear, familiar
- Cons: Tedious for many reorders

**My suggestion:** Option B (number input) - simple and effective

## Mobile Considerations

Following your kanban mobile patterns:

**Mobile Layout Options:**
1. **List View** - Configs as cards in vertical list
2. **Tab View** - Swipe between configs
3. **Swipe View** - Carousel of config cards

**My suggestion:** Provide list view (default) with simplified actions on mobile

## Next Steps

To proceed with implementation, I need your decisions on:

1. **Layout preference** (Split view vs tabs vs accordion)
2. **Execution feedback** (Modal vs toast vs status panel)
3. **Real-time updates** (Run progress only vs all changes)
4. **Automatic mode UI** (Separate page vs panel vs indicator)
5. **Priority management** (Drag-drop vs input vs arrows)

Once you provide guidance, I can begin implementation following the phase plan above.

## Mockup Summary

The proposed UI will feel like a natural extension of your existing interface:
- Same visual language and component library
- Familiar patterns from Memory/Plans pages
- Dark mode support
- Mobile responsive
- Keyboard shortcuts support
- Context menus for power users
- Real-time updates via SSE

**Theme:** Professional, efficient, and user-friendly - matching your current application aesthetic.
