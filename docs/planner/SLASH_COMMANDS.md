# Planner Slash Commands

The Planner tool includes slash command templates that provide convenient shortcuts for common planning operations. These commands are automatically copied to `.claude/commands/` when you run setup with the planner feature enabled.

## Available Commands

### `/plan-create`
Convert your current conversation into a comprehensive, tracked implementation plan.

**When to use:**
- Conversation has evolved into a large, complex task
- Realize you need multi-session tracking for the work ahead
- Want to properly structure and plan before beginning implementation
- Need to maximize utilization of the planner system's capabilities

**What it does:**
- Deeply analyzes the entire conversation for context
- Extracts goal, decisions, scope, and constraints
- Structures work into session-sized tasks (each ~1 day max)
- Creates comprehensive implementation plan with all fields populated
- Displays full plan details for review
- Asks if you want to start working immediately
- If yes: activates plan and immediately begins implementation
- If no: provides guidance on how to start later

**Key Features:**
- **Maximizes plan system utilization:** Fills all fields (goal, decisions, implementation_plan, tasks, notes) with meaningful content
- **Session-sized tasks:** Each task must be completable in one session (~1 day max)
- **No task count limits:** Creates as many tasks as needed to properly chunk the work
- **Full context extraction:** Captures WHY behind decisions, not just WHAT
- **Immediate execution option:** Can start working right away if desired

**Example:**
```
[Context: User has been discussing building a Redis-backed session system]

User: /plan-create

Claude: I'm going to create a comprehensive implementation plan based on our discussion.

[Analyzes conversation, extracts all context]

✓ Implementation plan created!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLAN: Implement Redis-backed session authentication
ID: auth-session-redis-implementation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GOAL
────
Replace JWT-based authentication with Redis session storage
to enable better session management, reduce token payload size,
and support features like session revocation and device tracking.

KEY DECISIONS
─────────────
• Session storage in Redis with TTL-based expiration
• httpOnly cookies for session ID transport
• 24-hour session TTL with sliding expiration

IMPLEMENTATION PLAN
───────────────────
## Phase 1: Infrastructure Setup
- Install and configure Redis client
- Set up session store with connect-redis
...

HIGH-LEVEL TASKS
────────────────
☐ Install Redis dependencies and configure client connection
☐ Set up session store with connect-redis and security settings
☐ Create session validation middleware
☐ Implement session creation logic for login
☐ Add session destruction for logout
☐ Update login endpoint to create sessions
☐ Update protected routes to use session middleware
☐ Remove old JWT generation and validation code
☐ Test session creation, validation, and expiration
☐ Test logout and session cleanup behavior

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Would you like to start working on this plan now? [Yes/No]

User: Yes

Claude: ✓ Plan activated!

Starting work on: Install Redis dependencies and configure client connection

Let me begin implementation...

[Immediately starts working through the plan]
```

**Important Notes:**
- Plan persists across sessions - can be resumed with `/plan-resume-work`
- Tasks are right-sized for single sessions (better than large multi-day tasks)
- All context from conversation is extracted and preserved
- Plan starts with status `"planning"`, moves to `"in_progress"` if you start immediately

### `/plan-pause-work`
Save your current work session state to resume later.

**When to use:**
- Ending your work day but want to save context
- Switching to a different task temporarily
- Need to step away from complex work mid-stream
- Want to preserve decisions and progress made

**What it does:**
- Automatically analyzes the current conversation
- Extracts what you're working on, decisions made, and progress
- Captures what's completed and what's next
- Saves or updates the plan with `status="on_hold"`
- Returns a session ID for later resumption

**Example:**
```
User: /plan-pause-work

Claude: I'm about to save your work session:

Working on: Replace JWT authentication with Redis-backed sessions
Completed: Session store implementation, Redis connection setup
Next steps: Create auth middleware, update login endpoint

Proceeding to save...

✓ Work session saved!

Session ID: paused-auth-refactor-2025-01-15
```

The LLM automatically captures context from the conversation - no need to re-explain what you've been working on. The session is stored using the planner MCP server and can be resumed anytime with `/plan-resume-work`.

### `/plan-resume-work`
Load a previously paused work session and immediately continue the work.

**When to use:**
- Starting a new work session
- Returning to paused work
- Need to pick up where you left off
- Want to continue unfinished work

**What it does:**
- Searches for all paused work sessions
- Shows you available paused sessions
- Lets you select which one to resume
- Restores full context (decisions, progress, next steps)
- Updates session status to active
- **Immediately begins working on the next pending task**
- Marks session as completed when work is done

**Example:**
```
User: /plan-resume-work

Claude: Found 2 paused work sessions:

1. paused-auth-refactor-2025-01-15
   Replace JWT auth with Redis-backed sessions
   Paused: 3 days ago

2. paused-api-design-session
   Design new GraphQL API schema
   Paused: 1 week ago

Which session would you like to resume? (Enter number or ID)

User: 1

Claude: [Shows full context]

Ready to continue? [Yes/No]

User: Yes

Claude: ✓ Session resumed!

Continuing work on: Replace JWT auth with Redis-backed sessions
Next step: Create auth middleware

Let me pick up where we left off...

[Immediately starts implementing the auth middleware]
```

After resumption, Claude:
- Displays the full session context for review
- Confirms you're ready to continue
- **Immediately begins working** (doesn't ask "where to start?")
- Uses all restored context to inform implementation
- Marks the session as "completed" when all tasks are done

## Installation

Slash commands are automatically installed when you:

1. Run `npx cc-devtools setup`
2. Select the planner feature
3. Choose "yes" when prompted about slash command templates

They will be copied to `.claude/commands/` in your project.

## Usage

Once installed, use these commands in Claude Code by typing `/` followed by the command name:

```
/plan-create    # Convert conversation into comprehensive implementation plan
/plan-pause-work     # Save current work session to resume later
/plan-resume-work    # Load and continue a paused work session
```

The slash command will expand into a detailed prompt that instructs Claude on how to use the Planner MCP tools.

## How It Works

### Session Storage

Paused sessions are stored as plans in the planner system:
- **Status:** Set to `on_hold` for easy identification
- **Goal:** What you were trying to accomplish
- **Decisions:** Key choices made during the session
- **Implementation Plan:** What's completed + what's next
- **Tasks:** Next steps represented as pending tasks
- **Notes:** Blockers, important context, reminders

### Session Lifecycle

1. **Pause:** Use `/plan-pause-work` to save current context
   - If active plan exists: updates it to status `on_hold`
   - If no active plan: creates new plan with status `on_hold`
   - Captures all context needed to resume

2. **Resume:** Use `/plan-resume-work` to restore context
   - Searches for plans with status `on_hold`
   - Loads full context and displays it
   - Updates plan status to `in_progress`
   - **Immediately begins working** on the next task

3. **Complete:** When finished with the work
   - **CRITICAL:** Claude automatically marks the plan as "completed"
   - This prevents pollution of the plans database
   - Completed sessions won't appear in future `/plan-resume-work` searches

### Session Cleanup

**Every resumed session must end with one of these outcomes:**

- ✅ **Work completed:** Plan status → "completed" (automatic by Claude)
- ✅ **Work cancelled:** Plan status → "abandoned" (if work is no longer needed)
- ✅ **Work re-paused:** User runs `/plan-pause-work` (new session created) + Claude marks old session → "completed"

**Do NOT leave sessions in "in_progress" status indefinitely** - this pollutes the plans data and makes future searches cluttered.

When you resume a session, Claude will automatically mark it as completed when the work goals are achieved. If you need to pause again before completing, run `/plan-pause-work` yourself (Claude cannot invoke slash commands), and Claude will mark the old session as completed or abandoned.

### Context Management

**Important limitation:** Claude cannot invoke slash commands like `/plan-pause-work`.

If your conversation with Claude grows very large during resumed work:
1. Claude will inform you that the context is getting large
2. Claude will suggest you run `/plan-pause-work` to save progress
3. You decide whether to pause or continue
4. If you pause, Claude marks the old session as completed when you create the new pause

**Example:**
```
Claude: Our conversation is getting quite long. I recommend using
/plan-pause-work to save our progress so we can continue in a fresh
session. Would you like to do that, or should I continue?

User: Let me pause
User: /plan-pause-work

Claude: [Creates new paused session with current context]
[Marks the old resumed session as completed]
```

### Multiple Sessions

You can have multiple paused sessions simultaneously:
- Each has a unique ID (e.g., `paused-auth-refactor-2025-01-15`)
- All are searchable via `/plan-resume-work`
- Resume the one you need when you need it
- Sessions persist across Claude Code restarts

## Customization

The slash command templates are copied to your project, so you can customize them:

1. Navigate to `.claude/commands/`
2. Edit `plan-create.md`, `plan-pause-work.md`, or `plan-resume-work.md`
3. Modify the prompt to suit your workflow
4. Save and the changes take effect immediately

## Technical Details

- **Format:** Markdown files in `.claude/commands/`
- **Naming:** `plan-create.md`, `plan-pause-work.md`, `plan-resume-work.md`
- **Source:** Copied from `node_modules/@shaenchen/cc-devtools/templates/commands/planner/`
- **Storage:** Uses planner MCP server (`plan_store`, `plan_search`, `plan_update`)
- **Identification:**
  - Plans created by `/plan-create`: status `"planning"` or `"in_progress"`
  - Paused sessions: status `"on_hold"`
- **Customizable:** Yes, files are owned by your project after setup

## Benefits

### Proactive Planning (`/plan-create`)
- **Maximize system utilization:** Extracts all valuable context from conversation (goal, decisions, constraints)
- **Right-sized tasks:** Creates session-sized tasks (1 day max) for better progress tracking
- **Immediate execution:** Option to start working right away after plan creation
- **Full context extraction:** Captures WHY behind decisions, not just WHAT was decided
- **Multi-session readiness:** Plans persist and can be resumed across multiple sessions
- **No artificial limits:** Creates as many tasks as needed to properly chunk the work

### Context Preservation
- Eliminates "Where was I?" moments
- Automatically captures decisions and rationale from conversation
- Maintains momentum across sessions
- No need to manually document what you were doing

### Seamless Resumption
- Quickly recall what you were doing
- Restore full context in seconds
- Continue work without mental overhead

### Multi-tasking Support
- Pause one task, work on another
- Keep multiple contexts active
- Switch between tasks effortlessly

### Knowledge Retention
- Documents decisions made
- Tracks progress over time
- Creates history of work approach

### Clean Data Management
- Automatic session completion prevents data pollution
- Old sessions are marked as completed, not left dangling
- Only active/pending sessions appear in searches
- Plans database stays clean and organized

## Related Documentation

- [Planner Tool Documentation](./README.md)
- [Planner Implementation Details](./planner_implementation.md)
- [Main Package README](../../README.md)
