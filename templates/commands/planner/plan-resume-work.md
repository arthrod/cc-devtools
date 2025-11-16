# Resume Paused Work Session

Load a previously paused work session and restore comprehensive context to enable seamless resumption.

## Core Principle

The plan contains **everything** needed to resume work - use it as your complete context. Work autonomously using the detailed context provided.

## Instructions

### 1. Search for Paused Sessions

Use `plan_search` to find plans with `status="on_hold"`:
```
plan_search(query="", status="on_hold", summary_only=true, limit=10)
```

### 2. Handle Search Results

**If no paused sessions found:**
```
No paused work sessions found.

You can pause your current work anytime with:
/plan-pause-work
```

**If one paused session found:**
- Display the session details (see step 3)
- Ask user to confirm resuming
- If yes, proceed to step 4

**If multiple paused sessions found:**
- List all with key info:
  ```
  Found {count} paused work sessions:

  1. {plan.summary}
     ID: {plan.id}
     Paused: {relative time from updated_at}

  2. {plan.summary}
     ID: {plan.id}
     Paused: {relative time}

  Which session would you like to resume? (Enter number or ID)
  ```
- Wait for user selection

### 3. Display Comprehensive Session Context

Use `plan_search` to load the full plan with all details:
```
plan_search(id="{plan-id}", status="on_hold", summary_only=false, limit=1)
```

**Display the comprehensive context in a structured, readable format:**

```
═══════════════════════════════════════════════════════════════
RESUMING WORK SESSION
═══════════════════════════════════════════════════════════════

📋 {summary}
🆔 ID: {id}
⏸️  Paused: {formatted date/time from updated_at}

───────────────────────────────────────────────────────────────
🎯 BACKGROUND & GOAL
───────────────────────────────────────────────────────────────

{Display goal field - this contains comprehensive background:
 - What we're building
 - Why it's needed
 - Technical context
 - Success criteria}

───────────────────────────────────────────────────────────────
🧠 KEY DECISIONS & RATIONALE
───────────────────────────────────────────────────────────────

{Display decisions field - this contains:
 - Core approach with rationale
 - Technical choices
 - Trade-offs considered
 - Patterns & conventions
 - Design constraints}

───────────────────────────────────────────────────────────────
📂 IMPLEMENTATION PROGRESS
───────────────────────────────────────────────────────────────

{Display implementation_plan field - this contains:
 - Files created/modified with roles
 - What's completed and why
 - What's in progress
 - Current file context
 - Detailed next steps}

───────────────────────────────────────────────────────────────
✅ TASK LIST
───────────────────────────────────────────────────────────────

{List all tasks with their status and details:
 1. [status] {task.summary}
    {task.details if present}

 2. [status] {task.summary}
    {task.details if present}}

───────────────────────────────────────────────────────────────
📝 IMPORTANT NOTES & CONTEXT
───────────────────────────────────────────────────────────────

{Display notes field - this contains:
 - Key files reference with roles
 - File relationships
 - Conversation context
 - Blockers & issues
 - Things to remember
 - Questions & unknowns
 - Error messages encountered
 - Technical discoveries}

═══════════════════════════════════════════════════════════════

Ready to continue? [Yes/No]
```

**Purpose of Display:**
- Give you complete context at a glance
- Remind you of decisions and rationale
- Show exact file locations and relationships
- Surface important gotchas and discoveries
- Make it clear what's done, what's in-progress, and what's next

### 4. Update Status and Begin Autonomous Work

**If user confirms, follow this sequence:**

#### A. Update plan to `in_progress`
```
plan_update(id="{plan-id}", plan_status="in_progress")
```

#### B. Display brief confirmation
```
✓ Session resumed!

Continuing work on: {summary}
Next task: {first pending task summary}

Picking up where we left off...
```

#### C. **IMMEDIATELY Begin Working Autonomously**

**CRITICAL: Work without asking permission or clarification - the plan has everything you need.**

**Use the comprehensive context:**
1. **Decisions & Rationale** - Follow the architectural decisions documented
2. **File References** - Use the exact file paths, roles, and relationships provided
3. **Technical Context** - Apply constraints, patterns, and discoveries documented
4. **Implementation Plan** - Follow the detailed approach outlined
5. **Notes** - Remember gotchas, conversation context, and things to watch for

**Start with the first pending task:**
- Read the task summary AND details - details contain file context and approach
- Reference the relevant files from the notes section
- Apply the decisions and patterns documented
- Watch for any gotchas or considerations mentioned
- Implement the task completely

**Mark tasks complete as you finish them (WITHOUT ASKING):**

```
plan_update(
  id: "{plan-id}",
  task_updates=[{index: 0, status: "completed"}]
)
```

**Then immediately move to the next pending task and repeat.**

#### D. Track Progress Proactively

As you work through tasks:

1. **Mark completed tasks** - Update task status to "completed" as soon as you finish each one
2. **Don't ask for permission** - The plan authorizes you to work autonomously
3. **Add notes for discoveries** - If you discover new issues or important context:
   ```
   plan_update(
     id: "{plan-id}",
     add_note: "Discovered {new information while working on task X}"
   )
   ```

4. **Work through the task list** - Continue until all tasks are completed or you hit a blocker

#### E. Handle Blockers

**If you encounter a blocker:**
1. Mark the current task as "in_progress" (not completed)
2. Add a note about the blocker:
   ```
   plan_update(
     id: "{plan-id}",
     task_updates=[{index: N, status: "in_progress"}],
     add_note: "BLOCKER on task {N}: {description of blocker and what's needed}"
   )
   ```
3. Inform the user about the blocker and what's needed to proceed
4. Suggest they use `/plan-pause-work` to save state if they need to address blocker later

**Do NOT mark as blocker:**
- Normal implementation decisions (use the documented approach)
- Questions about file locations (use the notes section)
- Uncertainty about patterns (use the decisions section)

**Only mark as blocker:**
- Missing external resources (APIs down, credentials missing)
- User decision needed that wasn't documented
- Fundamental approach question not covered in plan

### 5. Complete the Work Session

**When all tasks are completed:**

```
plan_update(id="{plan-id}", plan_status="completed")
```

Display completion summary:
```
✓ Work completed!

Summary of accomplishments:
- {task 1 completed}
- {task 2 completed}
- {task N completed}

{Brief description of what was built/fixed}

I've marked the plan as completed.
```

## Context Management

**CRITICAL: When conversation gets large while working on a resumed plan:**

Do NOT suggest creating a new paused session with `/plan-pause-work` - that would orphan the current plan!

Instead, **update the EXISTING plan and mark it back as `on_hold`:**

### When to Pause

If conversation is getting long (context approaching limit), proactively suggest to user:

```
Our conversation is getting quite long. To prevent context overflow, I recommend
we pause here and you can resume this work in a fresh session.

I'll update the plan with our progress and mark it as paused so you can resume
it later with `/plan-resume-work`.

Should I pause this work session now? [Yes/No]
```

### How to Pause (if user confirms)

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
/plan-resume-work

The plan will load with all context from this session preserved.
```

### Why This Matters

- **Prevents orphaned plans**: We update the existing plan, not create a new one
- **Preserves continuity**: The same plan ID tracks the entire feature implementation
- **Clean resumption**: Future `/plan-resume-work` will find this plan with all progress intact
- **No plan pollution**: Avoids cluttering the plans database with abandoned in_progress plans

### You CANNOT Invoke Slash Commands

Remember: You can only SUGGEST slash commands to the user, never invoke them yourself.

## Example: Comprehensive Resume Flow

```
User: /plan-resume-work

Claude: [Searches for on_hold plans]

Found 2 paused work sessions:

1. Migrate authentication from JWT to Redis-backed sessions
   ID: auth-refactor-2025-01-15
   Paused: 3 days ago

2. Design new GraphQL API schema
   ID: api-design-session
   Paused: 1 week ago

Which session would you like to resume? (Enter number or ID)

User: 1

Claude: [Loads full plan with all comprehensive details]

═══════════════════════════════════════════════════════════════
RESUMING WORK SESSION
═══════════════════════════════════════════════════════════════

📋 Migrate authentication from JWT to Redis-backed sessions
🆔 ID: auth-refactor-2025-01-15
⏸️  Paused: Jan 15, 2025 at 2:30 PM (3 days ago)

───────────────────────────────────────────────────────────────
🎯 BACKGROUND & GOAL
───────────────────────────────────────────────────────────────

## Background & Context

### What We're Building
Replacing JWT-based authentication with Redis-backed session storage
for improved security and session management capabilities.

### Why It's Needed
- Current JWT approach lacks server-side session invalidation
- Need ability to revoke sessions for security (logout from all devices)
- Want sliding expiration for better UX
- Audit trail of active sessions per user

### Technical Context
- Framework/Stack: Node.js, Express 4.18, existing auth infrastructure
- Key Dependencies: redis 4.6, express-session, connect-redis
- Constraints: Zero downtime deployment, backward compatibility required
- Integration Points: Existing auth middleware, user service, API routes

### Success Criteria
- All auth flows use Redis sessions
- JWT support deprecated but functional
- Session management endpoints working
- Tests passing, performance acceptable

───────────────────────────────────────────────────────────────
🧠 KEY DECISIONS & RATIONALE
───────────────────────────────────────────────────────────────

## Architectural Decisions

### Core Approach
- **Decision**: Use Redis with express-session and connect-redis
- **Rationale**: Mature libraries, fits Express patterns, Redis provides speed + persistence
- **Trade-offs**: Added Redis dependency (ops complexity) but gained session control
- **Alternatives**: PostgreSQL too slow, JWT+revocation defeats purpose

### Technical Choices
- **Session Storage**: Redis with 24h TTL, sliding expiration
- **Cookie Config**: httpOnly, secure in prod, SameSite=Lax
- **Migration Path**: Dual-support for 2 weeks then deprecate JWT
- **Session Schema**: `sess:{sessionId}` → JSON with userId, timestamps

### Patterns & Conventions
- SessionStore abstraction for testability
- Middleware naming: `requireSession` (vs old `requireAuth`)
- Session errors return 401, not 500

### Design Constraints
- Cannot break existing API clients during migration
- Support multiple sessions per user (mobile + desktop)
- Keep session data minimal (user ID only)

───────────────────────────────────────────────────────────────
📂 IMPLEMENTATION PROGRESS
───────────────────────────────────────────────────────────────

## Completed Work

### Files Created/Modified
- **`src/middleware/SessionStore.ts`**: Redis session storage abstraction
  - Methods: create, get, destroy, touch
  - Handles errors gracefully, uses connection pooling

- **`src/config/redis.ts`**: Redis client configuration
  - Connection with retry logic
  - Environment-based config

- **`src/middleware/session.ts`**: express-session configuration
  - Integrates SessionStore, cookie settings applied

### What's Done
1. Redis connection established and tested ✓
2. SessionStore implemented with full CRUD ✓
3. Session middleware configured ✓

## In Progress

### Current Task
Implementing `requireSession` middleware in `src/middleware/auth.ts`

### What's Partially Complete
- Session lookup logic implemented
- MISSING: Error handling for expired/invalid sessions
- MISSING: User attachment to request object

### Current File Context
- Working in: `src/middleware/auth.ts`
- At: `requireSession` function, line 47
- Doing: Adding error handling for edge cases

## Next Steps (Detailed)

1. **Complete requireSession middleware**
   - Files: `src/middleware/auth.ts`
   - Handle: no cookie (401), invalid session (401), Redis error (503)
   - Must log all errors with context

2. **Update login endpoint**
   - Files: `src/controllers/AuthController.ts`
   - Create session after password verification
   - Also return JWT for backward compatibility

3. **Update logout endpoint**
   - Files: `src/controllers/AuthController.ts`
   - Destroy session, handle already-expired case

4. **Create session management endpoints**
   - Files: `src/routes/sessions.ts`, `src/controllers/SessionController.ts`
   - GET /sessions, DELETE /sessions/:id

5. **Integration testing**
   - Files: `test/integration/auth.test.ts`
   - Full flow + Redis failure scenarios

───────────────────────────────────────────────────────────────
✅ TASK LIST
───────────────────────────────────────────────────────────────

1. [pending] Complete requireSession middleware with error handling
   Files: src/middleware/auth.ts
   Approach: Handle no cookie (401), invalid session (401), Redis error (503)
   Considerations: Log all errors, attach user to req

2. [pending] Update login endpoint to create Redis sessions
   Files: src/controllers/AuthController.ts
   Why: Start creating sessions for new logins
   Dependencies: requireSession middleware must be complete

3. [pending] Update logout endpoint to destroy session
   Files: src/controllers/AuthController.ts
   Approach: Call SessionStore.destroy with session ID
   Watch for: Handle case where session already expired

4. [pending] Create session management endpoints
   Files: src/routes/sessions.ts, src/controllers/SessionController.ts
   Endpoints: GET /sessions, DELETE /sessions/:id
   Why: Allow users to view and revoke their sessions

5. [pending] Integration test full auth flow with sessions
   Files: test/integration/auth.test.ts
   Test: login → protected route → logout → verify destroyed
   Include: Redis failure scenarios

───────────────────────────────────────────────────────────────
📝 IMPORTANT NOTES & CONTEXT
───────────────────────────────────────────────────────────────

## Key Files Reference

### Core Files
- **`src/middleware/SessionStore.ts`**: Redis session abstraction, exports SessionStore class
- **`src/middleware/session.ts`**: express-session config, touch for cookie/TTL changes
- **`src/middleware/auth.ts`**: Has old `requireAuth` (JWT) and new `requireSession`
- **`src/controllers/AuthController.ts`**: Login/logout logic, needs session updates
- **`src/config/redis.ts`**: Redis client singleton, connection config

### File Relationships
- `session.ts` imports `SessionStore` from `SessionStore.ts`
- `SessionStore.ts` imports Redis client from `config/redis.ts`
- `auth.ts` will import session middleware from `session.ts`
- `AuthController.ts` imports `SessionStore` directly

### Entry Points
- Main: `src/index.ts` - need to apply session middleware globally
- Tests: `test/unit/middleware/` for unit tests
- Integration: `test/integration/auth.test.ts` for full flow

## Important Context

### Conversation Context
- User emphasized zero downtime during migration (dual support required)
- User wants "logout from all devices" feature
- Mobile app still uses JWT, can't update immediately
- Security audit identified session revocation as critical

### Blockers & Issues
- **Redis in Production**: DevOps provisioning this week (not blocking dev)
- **Session Secret**: User will add to deployment config

### Things to Remember
- Session ID generated by express-session (don't generate manually)
- Cookie maxAge (7 days) ≠ Redis TTL (24h with sliding)
- User model has `email` field (lowercase), not `username`
- Keep old JWT middleware functional until migration complete

### Questions & Unknowns
- Store user role in session or fetch on each request?
- Redis failure fallback behavior?

### Error Messages Encountered
- `Redis connection timeout` when Redis not running locally → `redis-server`

### Technical Discoveries
- express-session auto-handles cookie renewal (sliding works automatically)
- connect-redis has built-in retry (don't implement our own)
- Redis SETEX is atomic (no TTL race condition)

═══════════════════════════════════════════════════════════════

Ready to continue? [Yes/No]

User: Yes

Claude: [Updates plan to in_progress]

✓ Session resumed!

Continuing work on: Migrate authentication from JWT to Redis-backed sessions
Next task: Complete requireSession middleware with error handling

Picking up where we left off...

[IMMEDIATELY starts implementing based on comprehensive context]

I can see from the plan that I need to complete the `requireSession` middleware in `src/middleware/auth.ts`, currently at line 47. The middleware needs error handling for three cases:

1. No session cookie → 401
2. Invalid session → 401
3. Redis connection error → 503

Let me read the current state of the file and add the error handling...

[Uses Read tool to check current implementation]

[Implements the error handling based on the documented approach]

[Uses Write/Edit tools to complete the implementation]

✓ Completed error handling for requireSession middleware. The middleware now:
- Returns 401 when no session cookie present
- Returns 401 when session not found in Redis
- Returns 503 on Redis connection errors
- Logs all errors with context
- Attaches user object to request on success

[Marks task complete WITHOUT ASKING]

[Uses plan_update to mark task 0 as completed]

Moving to next task: Update login endpoint to create Redis sessions...

[Continues working through remaining tasks autonomously]

[After completing all tasks]

✓ Work completed!

Summary of accomplishments:
- ✅ Completed requireSession middleware with proper error handling
- ✅ Updated login endpoint to create Redis sessions (maintains JWT for compatibility)
- ✅ Updated logout endpoint to destroy sessions
- ✅ Created session management endpoints (GET /sessions, DELETE /sessions/:id)
- ✅ Added integration tests for full auth flow including Redis failure scenarios

Successfully migrated authentication to Redis-backed sessions with zero downtime. All tests passing, JWT support maintained for backward compatibility during 2-week transition period.

I've marked the plan as completed.
```

## Critical Guidelines

### Autonomous Work
- **Use the plan as complete context** - it contains everything needed
- **Don't ask permission** - work through tasks autonomously
- **Mark tasks complete immediately** - don't batch updates
- **Follow documented decisions** - rationale is provided
- **Use file references** - paths, roles, relationships all documented
- **Remember gotchas** - they're in the notes for a reason

### When NOT to Ask

Don't ask about:
- Which file to modify (it's in the task details or notes)
- What pattern to follow (it's in the decisions)
- Whether to proceed with a task (the plan authorizes you)
- Should I mark this complete (YES - always mark complete when done)

### When TO Ask

Only ask when:
- You hit a genuine blocker (external resource unavailable)
- User decision needed that wasn't documented in plan
- Fundamental approach question not covered

### Task Completion

**CRITICAL**: Mark tasks as "completed" **immediately** after finishing each one, **without asking permission**.

```
# As soon as you finish a task:
plan_update(
  id: "{plan-id}",
  task_updates=[{index: N, status: "completed"}]
)

# Then immediately start the next pending task
```

## Final Reminder

**You CANNOT invoke slash commands** - only suggest them to user (like `/plan-pause-work` when conversation gets long).
