# Implement Existing Plan

Find and begin autonomous implementation of existing plans that are not yet completed.

## Core Principle

This command helps you start or continue work on plans that exist but aren't finished. It finds non-completed plans, lets you choose one, and immediately begins autonomous implementation using all documented context.

## When to Use This Command

Use `/plan-implement` when you want to:
- Start working on a plan you created earlier (status: `planning`)
- Resume a paused plan (status: `on_hold`)
- Continue work on an in-progress plan (status: `in_progress`)
- Revive an abandoned plan (status: `abandoned`)

## Instructions

### Phase 1: Search for Non-Completed Plans

Search for all plans that aren't completed:

```
plan_search(query="", include_all_statuses=true, summary_only=true, limit=20)
```

**Filter results to exclude completed plans** - only show plans with status: `planning`, `in_progress`, `on_hold`, or `abandoned`.

### Phase 2: Display Available Plans

If no non-completed plans found:
```
No plans available to implement.

All your plans are either completed or you haven't created any yet.

To create a new plan:
/plan-create
```

If plans found, display them grouped by status:

```
Found {count} plan(s) available for implementation:

═══════════════════════════════════════════════════════════════
📋 READY TO START (planning)
═══════════════════════════════════════════════════════════════

{If any plans with status="planning":
1. {plan.summary}
   ID: {plan.id}
   Created: {relative time from created_at}
}

═══════════════════════════════════════════════════════════════
🚧 IN PROGRESS (in_progress)
═══════════════════════════════════════════════════════════════

{If any plans with status="in_progress":
2. {plan.summary}
   ID: {plan.id}
   Last updated: {relative time from updated_at}
}

═══════════════════════════════════════════════════════════════
⏸️  PAUSED (on_hold)
═══════════════════════════════════════════════════════════════

{If any plans with status="on_hold":
3. {plan.summary}
   ID: {plan.id}
   Paused: {relative time from updated_at}
}

═══════════════════════════════════════════════════════════════
🗑️  ABANDONED (abandoned)
═══════════════════════════════════════════════════════════════

{If any plans with status="abandoned":
4. {plan.summary}
   ID: {plan.id}
   Abandoned: {relative time from updated_at}
}

═══════════════════════════════════════════════════════════════

Which plan would you like to implement? (Enter number or ID)
```

Wait for user selection.

### Phase 3: Load Full Plan Details

Once user selects a plan, load complete details:

```
plan_search(id="{selected-plan-id}", summary_only=false, limit=1)
```

### Phase 4: Display Comprehensive Plan Context

Show the full plan in structured format:

```
═══════════════════════════════════════════════════════════════
IMPLEMENTING PLAN
═══════════════════════════════════════════════════════════════

📋 {summary}
🆔 ID: {id}
📊 Current Status: {status}
📅 Created: {formatted date from created_at}
📝 Last Updated: {formatted date from updated_at}

───────────────────────────────────────────────────────────────
🎯 BACKGROUND & GOAL
───────────────────────────────────────────────────────────────

{Display goal field - comprehensive background:
 - What we're building
 - Why it's needed
 - Technical context
 - Success criteria}

───────────────────────────────────────────────────────────────
🧠 KEY DECISIONS & RATIONALE
───────────────────────────────────────────────────────────────

{Display decisions field:
 - Core approach with rationale
 - Technical choices
 - Trade-offs considered
 - Patterns & conventions
 - Design constraints}

───────────────────────────────────────────────────────────────
📂 IMPLEMENTATION APPROACH
───────────────────────────────────────────────────────────────

{Display implementation_plan field:
 - Phased breakdown
 - Files and specific steps
 - What's completed vs remaining
 - Testing approach}

───────────────────────────────────────────────────────────────
✅ TASK LIST
───────────────────────────────────────────────────────────────

{List all tasks with status indicators:
 1. [completed/in_progress/pending] {task.summary}
    {task.details if present}

 2. [status] {task.summary}
    {task.details if present}

 ...}

Progress: {completed_count}/{total_count} tasks completed

───────────────────────────────────────────────────────────────
📝 IMPORTANT NOTES & CONTEXT
───────────────────────────────────────────────────────────────

{Display notes field:
 - Key files reference with roles
 - File relationships
 - Blockers & issues
 - Things to remember
 - Questions & unknowns
 - Technical discoveries}

═══════════════════════════════════════════════════════════════

Ready to {start/continue/resume} implementation? [Yes/No]
```

**Display verb based on status:**
- `planning` → "start"
- `in_progress` → "continue"
- `on_hold` → "resume"
- `abandoned` → "revive and start"

### Phase 5: Begin Autonomous Implementation

**If user says Yes:**

#### A. Update Plan Status

**If status is NOT already `in_progress`, update it:**
```
plan_update(id: "{plan-id}", plan_status: "in_progress")
```

**If status is already `in_progress`, no status update needed.**

#### B. Display Confirmation

Show what's happening:
```
✓ Plan activated for implementation!

{If status was "planning":}
Starting work on: {summary}
First task: {first pending task summary}

{If status was "in_progress":}
Continuing work on: {summary}
Next task: {next pending/in_progress task summary}

{If status was "on_hold":}
Resuming work on: {summary}
Next task: {next pending task summary}

{If status was "abandoned":}
Reviving plan: {summary}
Starting from: {first pending task or task 0}

Let me begin implementation...
```

#### C. Begin Autonomous Work (IMMEDIATELY)

**CRITICAL: Start working WITHOUT asking permission - the plan contains everything needed.**

**Use comprehensive context:**
1. **Read all plan fields** - goal, decisions, implementation_plan, notes
2. **Follow documented approach** - use the architectural decisions and rationale
3. **Reference files from notes** - file paths, roles, relationships, entry points
4. **Watch for gotchas** - things to remember, blockers mentioned
5. **Apply technical context** - constraints, patterns, discoveries documented

**Determine where to start:**

**If status was "planning" (never started):**
- Start with the first pending task (index 0)
- Use the implementation plan phases to guide work
- Reference the documented approach and file details

**If status was "in_progress" or "on_hold" (already started):**
- Find the first task that's NOT completed
- If a task is marked "in_progress", continue that task
- If only pending tasks remain, start with the first pending one
- Use progress notes to understand what's been done

**If status was "abandoned":**
- Review why it might have been abandoned (check notes)
- Start with first pending task
- May need to verify previous work is still valid

**Work autonomously:**
- Implement the current task completely using all documented context
- **Mark task complete immediately when done (WITHOUT ASKING):**
  ```
  plan_update(
    id: "{plan-id}",
    task_updates=[{index: N, status: "completed"}]
  )
  ```
- Move to next pending task immediately
- Add notes for new discoveries:
  ```
  plan_update(
    id: "{plan-id}",
    add_note: "Discovered X while implementing Y - adjusted approach..."
  )
  ```
- Continue until all tasks complete or hit blocker

**Handle blockers:**
- Mark task as "in_progress" (not completed)
- Add note about blocker:
  ```
  plan_update(
    id: "{plan-id}",
    task_updates=[{index: N, status: "in_progress"}],
    add_note: "BLOCKER on task {N}: {description and what's needed}"
  )
  ```
- Inform user about blocker
- Suggest `/plan-pause-work` if they need to address blocker later

#### D. Complete the Plan

**When all tasks are finished:**

```
plan_update(id: "{plan-id}", plan_status: "completed")
```

Display completion:
```
✓ Plan completed!

Summary of accomplishments:
- {task 1 completed}
- {task 2 completed}
- {task N completed}

{Brief description of what was built/fixed}

I've marked the plan as completed.
```

**If user says No:**

```
No problem! The plan remains available.

Plan ID: {id}
Current Status: {status}

To implement it later:
• /plan-implement - Run this command again
• /plan-resume-work - Resume any on_hold plans
• plan_search(id="{id}") - Retrieve this specific plan

The plan contains all the context you need to start anytime!
```

Then STOP - do not take further action.

## Example: Starting a Planning-Status Plan

```
User: /plan-implement

Claude: [Searches for non-completed plans]

Found 3 plan(s) available for implementation:

═══════════════════════════════════════════════════════════════
📋 READY TO START (planning)
═══════════════════════════════════════════════════════════════

1. Implement OAuth authentication with Google and GitHub using NextAuth.js
   ID: oauth-authentication-nextauth
   Created: 2 hours ago

═══════════════════════════════════════════════════════════════
⏸️  PAUSED (on_hold)
═══════════════════════════════════════════════════════════════

2. Add Redis caching layer for API routes
   ID: redis-api-caching
   Paused: 3 days ago

═══════════════════════════════════════════════════════════════

Which plan would you like to implement? (Enter number or ID)

User: 1

Claude: [Loads full plan details]

═══════════════════════════════════════════════════════════════
IMPLEMENTING PLAN
═══════════════════════════════════════════════════════════════

📋 Implement OAuth authentication with Google and GitHub using NextAuth.js
🆔 ID: oauth-authentication-nextauth
📊 Current Status: planning
📅 Created: Jan 15, 2025 at 2:30 PM
📝 Last Updated: Jan 15, 2025 at 2:30 PM

───────────────────────────────────────────────────────────────
🎯 BACKGROUND & GOAL
───────────────────────────────────────────────────────────────

## Background & Context

### What We're Building
OAuth-based authentication system allowing users to log in with Google
or GitHub accounts, integrated with existing PostgreSQL user database.

### Why It's Needed
Moving from prototype to production - users need secure authentication.
User request for social login capabilities.

### Technical Context
- Framework/Stack: Next.js 14, TypeScript, PostgreSQL
- Key Dependencies: NextAuth.js, Google OAuth API, GitHub OAuth API
- Constraints: Strict TypeScript (no any types)
- Integration Points: Existing User model in PostgreSQL database

### Success Criteria
- Users can log in with Google or GitHub
- Users can access their profile after authentication
- Sessions persist correctly
- Email matching between providers handled properly

───────────────────────────────────────────────────────────────
🧠 KEY DECISIONS & RATIONALE
───────────────────────────────────────────────────────────────

## Architectural Decisions

### Core Approach
- **Decision**: Use NextAuth.js for OAuth flow and session management
- **Rationale**: Mature, well-tested library that handles OAuth complexity
- **Trade-offs**: Dependency on external library vs time savings and security
- **Alternatives Considered**: Building OAuth flow manually (rejected - too complex)

### Technical Choices
- **OAuth Providers**: Google and GitHub (user requirements)
- **Session Strategy**: Database sessions (integrate with PostgreSQL)
- **Type Safety**: Strict TypeScript, no any types

### Patterns & Conventions
- NextAuth.js file-based routing (`api/auth/[...nextauth]/route.ts`)
- Session callbacks for custom user data
- Adapter pattern for PostgreSQL integration

───────────────────────────────────────────────────────────────
📂 IMPLEMENTATION APPROACH
───────────────────────────────────────────────────────────────

## Phase 1: NextAuth Setup & Configuration
1. Install NextAuth.js and dependencies
2. Create NextAuth API route
3. Set up environment variables

## Phase 2: OAuth Provider Configuration
1. Obtain OAuth credentials
2. Configure providers in NextAuth

## Phase 3: Database Integration
1. Set up PostgreSQL adapter
2. Handle user creation/lookup

## Phase 4: UI Integration
1. Add login/logout buttons
2. Add session provider
3. Protect routes

## Phase 5: Testing
1. Test OAuth flow for both providers
2. Test session persistence
3. Test email mismatch handling

───────────────────────────────────────────────────────────────
✅ TASK LIST
───────────────────────────────────────────────────────────────

1. [pending] Install NextAuth.js and set up basic configuration
   Files: package.json, src/app/api/auth/[...nextauth]/route.ts, .env.local
   Approach: Install dependencies, create API route, configure base settings

2. [pending] Obtain and configure OAuth credentials for Google and GitHub
   Files: .env.local, src/app/api/auth/[...nextauth]/route.ts
   Approach: Register apps with providers, add credentials, configure settings

3. [pending] Integrate NextAuth with PostgreSQL and User model
   Files: src/app/api/auth/[...nextauth]/route.ts, src/models/user.ts
   Approach: Set up adapter, implement callbacks, handle email matching

4. [pending] Add authentication UI components and session provider
   Files: src/components/Header.tsx, src/app/layout.tsx, src/middleware.ts
   Approach: Add login/logout buttons, wrap app with provider, protect routes

5. [pending] Test complete authentication flow and edge cases
   Files: Create test files in src/__tests__
   Approach: Test both providers, session persistence, email mismatch

Progress: 0/5 tasks completed

───────────────────────────────────────────────────────────────
📝 IMPORTANT NOTES & CONTEXT
───────────────────────────────────────────────────────────────

## Key Files Reference

### Core Files
- **`src/app/api/auth/[...nextauth]/route.ts`**: NextAuth configuration
- **`src/models/user.ts`**: Existing User model
- **`src/components/Header.tsx`**: Contains login UI
- **`src/app/layout.tsx`**: App layout
- **`src/middleware.ts`**: (New) Route protection

### File Relationships
- NextAuth route uses User model for database operations
- Header component uses NextAuth client functions
- Layout wraps app with SessionProvider
- Middleware protects routes using session checks

## Important Context

### Blockers & Issues
- **OAuth Credentials**: Need to register apps with Google and GitHub
- **Environment Variables**: Need NEXTAUTH_SECRET generated

### Things to Remember
- **Email Mismatch**: Handle case where emails differ between providers
- **Type Safety**: Must use proper TypeScript types, no any types
- **Next.js 14**: Use app router conventions (not pages router)

═══════════════════════════════════════════════════════════════

Ready to start implementation? [Yes/No]

User: Yes

Claude: [Updates plan status to in_progress]

✓ Plan activated for implementation!

Starting work on: Implement OAuth authentication with Google and GitHub using NextAuth.js
First task: Install NextAuth.js and set up basic configuration

Let me begin implementation...

[IMMEDIATELY starts working autonomously]

I'll start by installing the necessary dependencies for NextAuth.js:

[Uses Bash to install packages]
[Creates the NextAuth API route]
[Sets up environment variables]

✓ Completed task 1: NextAuth.js installation and basic configuration

[Marks task 0 as completed WITHOUT ASKING]

Moving to task 2: Obtaining and configuring OAuth credentials...

[Continues autonomous implementation through all tasks]

[After completing all 5 tasks]

✓ Plan completed!

Summary of accomplishments:
- ✅ Installed and configured NextAuth.js
- ✅ Set up OAuth providers for Google and GitHub
- ✅ Integrated with PostgreSQL user database
- ✅ Added authentication UI with login/logout functionality
- ✅ Created comprehensive test suite for auth flow

Successfully implemented OAuth authentication with NextAuth.js. Users can now
log in with Google or GitHub, sessions are stored in PostgreSQL, and all routes
are properly protected.

I've marked the plan as completed.
```

## Example: Continuing an In-Progress Plan

```
User: /plan-implement

Claude: [Searches for non-completed plans]

Found 1 plan available for implementation:

═══════════════════════════════════════════════════════════════
🚧 IN PROGRESS (in_progress)
═══════════════════════════════════════════════════════════════

1. Add Redis caching layer for API routes
   ID: redis-api-caching
   Last updated: 1 hour ago

═══════════════════════════════════════════════════════════════

Which plan would you like to implement? (Enter number or ID)

User: 1

Claude: [Loads full plan with current progress]

═══════════════════════════════════════════════════════════════
IMPLEMENTING PLAN
═══════════════════════════════════════════════════════════════

📋 Add Redis caching layer for API routes
🆔 ID: redis-api-caching
📊 Current Status: in_progress
📅 Created: Jan 14, 2025
📝 Last Updated: Jan 15, 2025 at 3:15 PM

{... shows full plan context ...}

───────────────────────────────────────────────────────────────
✅ TASK LIST
───────────────────────────────────────────────────────────────

1. [completed] Set up Redis client and connection configuration
2. [completed] Create caching middleware for API routes
3. [in_progress] Implement cache invalidation on data updates
4. [pending] Add caching to priority routes (/api/users, /api/posts)
5. [pending] Test caching behavior and Redis failure scenarios

Progress: 2/5 tasks completed

{... shows notes and context ...}

═══════════════════════════════════════════════════════════════

Ready to continue implementation? [Yes/No]

User: Yes

Claude: [Plan already in_progress, no status update needed]

✓ Plan activated for implementation!

Continuing work on: Add Redis caching layer for API routes
Next task: Implement cache invalidation on data updates (currently in progress)

Let me pick up where we left off...

[Checks task 2 details and notes to understand current state]
[Completes the cache invalidation implementation]
[Marks task 2 as completed]
[Moves to task 3]
[Continues autonomously through remaining tasks]

✓ Plan completed!

{... completion summary ...}
```

## Critical Guidelines

### Autonomous Work
- **Start immediately without asking** - plan contains all needed context
- **Use all plan fields** - goal, decisions, implementation_plan, notes all contain critical information
- **Mark tasks complete immediately** - don't ask permission, just update when done
- **Follow documented approach** - decisions explain rationale and trade-offs
- **Reference file details** - paths, roles, relationships in notes
- **Remember gotchas** - things to watch for are documented

### Finding Next Task
- Look for first task with status NOT "completed"
- If task is "in_progress", continue that task
- If task is "pending", start it
- Check implementation_plan for phase context
- Use task details for file context and approach

### When NOT to Ask
- Which file to modify (it's in task details or notes)
- What pattern to follow (it's in decisions)
- Whether to proceed (plan authorizes autonomous work)
- Should I mark this complete (YES - always mark when done)

### When TO Ask
- Hit genuine blocker (external resource unavailable)
- User decision needed that wasn't documented
- Fundamental approach question not covered in plan

### Context Management

**CRITICAL: When conversation gets large while implementing a plan:**

Do NOT suggest creating a new paused session with `/plan-pause-work` - that would orphan the current plan!

Instead, **update the EXISTING plan and mark it back as `on_hold`:**

**When to Pause:**

If conversation is getting long (context approaching limit), proactively suggest to user:

```
Our conversation is getting quite long. To prevent context overflow, I recommend
we pause here and you can resume this work in a fresh session.

I'll update the plan with our progress and mark it as paused so you can resume
it later with /plan-resume-work or /plan-implement.

Should I pause this work session now? [Yes/No]
```

**How to Pause (if user confirms):**

**Step 1: Update the plan with current session progress**

```
plan_update(
  id: "{plan-id}",
  task_updates=[
    {index: 0, status: "completed"},  // Mark completed tasks
    {index: 1, status: "completed"},
    {index: 2, status: "in_progress"} // Mark current task as in_progress
  ],
  add_note: "Session paused on {date/time}. Completed tasks 0-1. Task 2 in progress: {brief context about what's done and what's next}. New discoveries: {any important learnings from this session}"
)
```

**Step 2: Mark plan as `on_hold`**

```
plan_update(
  id: "{plan-id}",
  plan_status: "on_hold"
)
```

**Step 3: Confirm to user**

```
✓ Work session paused!

Progress saved:
- ✅ Completed: {list completed tasks}
- 🔄 In progress: {current task}
- ⏸️  Plan marked as paused

You can resume this work anytime with:
/plan-resume-work  or  /plan-implement

The plan will load with all context from this session preserved.
```

**Why This Matters:**
- **Prevents orphaned plans**: We update the existing plan, not create a new one
- **Preserves continuity**: The same plan ID tracks the entire feature implementation
- **Clean resumption**: Future commands will find this plan with all progress intact
- **No plan pollution**: Avoids cluttering the plans database with abandoned in_progress plans

## Notes

- This command finds ALL non-completed plans (planning, in_progress, on_hold, abandoned)
- Groups plans by status for easy selection
- Displays full plan context before starting
- Supports starting fresh plans or continuing existing work
- Emphasizes autonomous implementation using documented context
- **You CANNOT invoke slash commands** - only suggest them to user
