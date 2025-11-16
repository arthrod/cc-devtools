# Pause Current Work Session

Save the current work session state with comprehensive context to enable seamless resumption later.

## Core Principle

When pausing work, capture **everything** needed to resume without reading the conversation history. The plan should be self-contained and comprehensive.

## Instructions

### 1. Check for Active Plan

Search for an existing plan with `status="in_progress"`:
```
plan_search(query="", status="in_progress", summary_only=false)
```

### 2A. If Active Plan Found - Update with Current Context

**IMPORTANT**: Don't just flip the status! Analyze the conversation since the plan was created and capture all new context.

Use `plan_update` to add new information discovered during work:

```
plan_update(
  id: "{plan-id}",
  plan_status: "on_hold",
  add_note: "## Session Progress Update

### New Decisions Made
- {any new architectural/technical decisions}
- {new patterns discovered or adopted}
- {changes to original approach and why}

### Files Modified/Created This Session
- `{file-path}`: {what changed and why}
- `{file-path}`: {role in implementation}

### Technical Discoveries
- {constraints discovered}
- {dependencies identified}
- {integration points}
- {gotchas or edge cases found}

### Current State
- {exactly where we are in implementation}
- {what's partially done}
- {what's blocking progress}

### Context for Resumption
- {important conversation details}
- {user preferences expressed}
- {things to remember}"
)
```

Then display:
```
✓ Updated and paused work session!

Plan: {plan.summary}
Status: on_hold
Progress: {brief summary of what was added}

When ready to resume, use:
/plan-resume-work
```

### 2B. If No Active Plan - Create Comprehensive Plan

**Analyze the entire conversation** and extract all context. Create a self-contained plan that enables resumption without conversation history.

```
plan_store(
  id: "{descriptive-id}",
  summary: "{1-2 sentence description of the work}",

  goal: "## Background & Context

### What We're Building
{Detailed description of what user is trying to accomplish}

### Why It's Needed
{Business/technical rationale - what problem does this solve?}

### What Led to This Work
{Was this a user request? Bug? Feature? Refactor? Provide context}

### Technical Context
- Framework/Stack: {relevant tech stack info}
- Key Dependencies: {libraries, services, APIs being used}
- Constraints: {performance limits, API rate limits, compatibility requirements}
- Integration Points: {what this connects to or depends on}

### Success Criteria
{What does 'done' look like?}",

  decisions: "## Architectural Decisions

### Core Approach
- **Decision**: {what was decided}
- **Rationale**: {why this approach}
- **Trade-offs**: {what we gave up, what we gained}
- **Alternatives Considered**: {other options and why rejected}

### Technical Choices
- **{Choice 1}**: {decision with reasoning}
- **{Choice 2}**: {decision with reasoning}

### Patterns & Conventions
- {coding patterns being followed}
- {naming conventions adopted}
- {project-specific conventions}

### Design Constraints
- {limitations that influenced decisions}
- {requirements that shaped approach}",

  implementation_plan: "## Implementation Overview

### Completed Work

#### Files Created/Modified
- **`{file-path}`**: {full role and what was implemented}
  - {Key functions/exports}
  - {How it fits in architecture}

- **`{file-path}`**: {full role and what was implemented}
  - {Important implementation details}
  - {Dependencies or imports}

#### What's Done
1. {Specific accomplishment} - {why it matters}
2. {Specific accomplishment} - {context}
3. {Tests/validation completed}

### In Progress

#### Current Task
{Detailed description of what's being worked on right now}

#### What's Partially Complete
- {Specific work that's started but not finished}
- {Why it's not complete - blocker, decision needed, etc.}

#### Current File Context
- Working in: `{file-path}`
- At: {function/section/line}
- Doing: {specific task}

### Next Steps (Detailed)

#### Immediate Next Action
**Task**: {what to do}
- **Files**: `{file1}`, `{file2}`
- **Approach**: {how to do it}
- **Considerations**: {things to watch out for}
- **Dependencies**: {what must be done first or available}

#### Subsequent Steps
2. **{Task}**: {description}
   - Files: `{files}`
   - Why: {rationale}
   - Watch for: {gotchas}

3. **{Task}**: {description}
   - Files: `{files}`
   - Why: {rationale}
   - Depends on: {previous tasks}

#### Final Steps
- {Testing approach}
- {Validation steps}
- {Documentation needs}",

  tasks: [
    {
      summary: "{immediate next action with file context}",
      details: "Files: {files}\nApproach: {how}\nConsiderations: {what to watch}",
      status: "pending"
    },
    {
      summary: "{next task}",
      details: "Files: {files}\nWhy: {rationale}\nDependencies: {what's needed first}",
      status: "pending"
    },
    // Include 3-7 tasks to cover immediate work
  ],

  notes: "## Key Files Reference

### Core Files
- **`{file}`**: {role in system, key exports, when to modify}
- **`{file}`**: {role in system, dependencies, important details}

### File Relationships
- `{file}` imports from `{file}` - {why}
- `{file}` depends on `{file}` - {relationship}

### Entry Points
- Main: `{file}` - {what it does}
- Tests: `{file}` - {coverage}

## Important Context

### Conversation Context
- {Key things user said}
- {User preferences expressed}
- {Important clarifications made}

### Blockers & Issues
- **{Blocker}**: {description and what's needed to unblock}
- **{Issue}**: {details and potential solutions}

### Things to Remember
- {Important gotchas discovered}
- {Quirks of the codebase}
- {Patterns to follow or avoid}

### Questions & Unknowns
- {Question that came up}
- {Uncertainty about approach}
- {Things to verify}

### Error Messages Encountered
- `{error}`: {when it happens, how to fix}

### Technical Discoveries
- {Performance characteristics}
- {API behaviors}
- {Library quirks}",

  status: "on_hold"
)
```

Then display a summary:
```
✓ Work session saved with comprehensive context!

Working on: {summary}

Key Information Captured:
• Background: {why we're doing this}
• {N} architectural decisions documented
• {N} files documented with roles
• {N} tasks defined for next steps
• Technical context and discoveries saved

When ready to resume, use:
/plan-resume-work
```

## Example: Comprehensive Pause (No Existing Plan)

```
[Context: User working on authentication refactor, conversation has covered architecture, decisions, and implementation]

User: /plan-pause-work

Claude: [Analyzes entire conversation comprehensively]

[Creates detailed plan capturing:]

✓ Work session saved with comprehensive context!

Working on: Migrate authentication from JWT to Redis-backed sessions

Key Information Captured:
• Background: Replace stateless JWT with Redis sessions for better security and session management
• 4 architectural decisions documented (Redis choice, cookie strategy, TTL approach, migration path)
• 7 files documented with roles (RedisStore, SessionMiddleware, AuthController, etc.)
• 5 detailed tasks defined for next steps
• Technical context: Redis client setup, session schema design, cookie configuration, error handling approach

When ready to resume, use:
/plan-resume-work
```

**Plan Content Created:**

**summary**: "Migrate authentication from JWT to Redis-backed sessions"

**goal**:
```
## Background & Context

### What We're Building
Replacing JWT-based authentication with Redis-backed session storage for improved security and session management capabilities.

### Why It's Needed
- Current JWT approach lacks server-side session invalidation
- Need ability to revoke sessions for security (logout from all devices)
- Want sliding expiration for better UX
- Audit trail of active sessions per user

### What Led to This Work
User request following security audit recommendation

### Technical Context
- Framework/Stack: Node.js, Express 4.18, existing auth infrastructure
- Key Dependencies: redis 4.6, express-session, connect-redis
- Constraints: Must maintain backward compatibility during migration, zero downtime deployment
- Integration Points: Existing auth middleware, user service, API routes

### Success Criteria
- All auth flows use Redis sessions
- JWT support deprecated but functional
- Session management endpoints working
- Tests passing, performance acceptable
```

**decisions**:
```
## Architectural Decisions

### Core Approach
- **Decision**: Use Redis with express-session and connect-redis middleware
- **Rationale**: Mature, well-tested libraries. Fits Express patterns. Redis provides speed + persistence.
- **Trade-offs**: Added Redis dependency (ops complexity) but gained session control and scalability
- **Alternatives Considered**:
  - PostgreSQL sessions: Too slow for per-request lookups
  - JWT + revocation list: Defeats JWT purpose, still lacks features we need

### Technical Choices
- **Session Storage**: Redis with 24h TTL, sliding expiration on activity
- **Cookie Configuration**: httpOnly, secure in prod, SameSite=Lax for CSRF protection
- **Migration Path**: Dual-support (JWT + sessions) for 2 weeks, then JWT deprecated
- **Session Schema**: Simple key-value, key format: `sess:{sessionId}`, value: JSON with userId, createdAt, lastActivity

### Patterns & Conventions
- All session operations go through SessionStore abstraction (testability, future Redis replacement easier)
- Middleware naming: `requireSession` (vs old `requireAuth`)
- Error handling: Session errors return 401, not 500

### Design Constraints
- Must not break existing API clients during migration
- Need to support multiple sessions per user (mobile + desktop)
- Session data kept minimal (user ID only, fetch user details on demand)
```

**implementation_plan**:
```
## Implementation Overview

### Completed Work

#### Files Created/Modified
- **`src/middleware/SessionStore.ts`**: Redis session storage abstraction
  - Methods: create, get, destroy, touch (for sliding expiration)
  - Handles Redis connection errors gracefully
  - Uses connection pooling for performance

- **`src/config/redis.ts`**: Redis client configuration
  - Connection setup with retry logic
  - Environment-based config (local vs production)
  - Exports singleton client instance

- **`src/middleware/session.ts`**: express-session configuration
  - Integrates SessionStore
  - Cookie settings applied
  - Secret from environment variable

#### What's Done
1. Redis connection established and tested - working in dev environment
2. SessionStore implemented with full CRUD - unit tests passing
3. Session middleware configured - ready to integrate

### In Progress

#### Current Task
Implementing session authentication middleware (`requireSession`) to replace `requireAuth`

#### What's Partially Complete
- `requireSession` middleware started in `src/middleware/auth.ts`
- Has session lookup logic
- Missing: error handling for expired/invalid sessions
- Missing: user attachment to request object

#### Current File Context
- Working in: `src/middleware/auth.ts`
- At: `requireSession` function, line 47
- Doing: Adding error handling for edge cases

### Next Steps (Detailed)

#### Immediate Next Action
**Task**: Complete `requireSession` middleware error handling
- **Files**: `src/middleware/auth.ts`
- **Approach**: Handle 3 cases: (1) no session cookie, (2) session not in Redis, (3) Redis connection error
- **Considerations**: Must return 401 for cases 1&2, 503 for case 3. Log errors for debugging.
- **Dependencies**: None, can complete now

#### Subsequent Steps
2. **Update login endpoint to create sessions**: Update `POST /auth/login`
   - Files: `src/controllers/AuthController.ts`
   - Why: Need to create session after password verification
   - Watch for: Must also return JWT for backward compatibility during migration

3. **Update logout endpoint**: Update `POST /auth/logout`
   - Files: `src/controllers/AuthController.ts`
   - Why: Destroy session on logout
   - Depends on: requireSession middleware complete

4. **Add session management endpoints**: Create new routes
   - Files: `src/routes/sessions.ts` (new), `src/controllers/SessionController.ts` (new)
   - Endpoints: GET /sessions (list user's sessions), DELETE /sessions/:id (revoke specific session)
   - Why: User feature request from security audit

5. **Migrate existing routes**: Update route protection
   - Files: `src/routes/*.ts` (multiple files)
   - Replace `requireAuth` with `requireSession` gradually
   - Start with low-traffic routes for testing

#### Final Steps
- Integration testing of full auth flow
- Load testing (Redis performance under load)
- Documentation update (API docs, README)
```

**tasks**:
```javascript
[
  {
    summary: "Complete requireSession middleware with error handling",
    details: "Files: src/middleware/auth.ts\nApproach: Handle no cookie (401), invalid session (401), Redis error (503)\nConsiderations: Log all errors with context, attach user object to req",
    status: "pending"
  },
  {
    summary: "Update login endpoint to create Redis sessions",
    details: "Files: src/controllers/AuthController.ts\nWhy: Start creating sessions for new logins\nDependencies: requireSession middleware must be complete",
    status: "pending"
  },
  {
    summary: "Update logout endpoint to destroy session",
    details: "Files: src/controllers/AuthController.ts\nApproach: Call SessionStore.destroy with session ID\nWatch for: Handle case where session already expired",
    status: "pending"
  },
  {
    summary: "Create session management endpoints",
    details: "Files: src/routes/sessions.ts, src/controllers/SessionController.ts\nEndpoints: GET /sessions, DELETE /sessions/:id\nWhy: Allow users to view and revoke their sessions",
    status: "pending"
  },
  {
    summary: "Integration test full auth flow with sessions",
    details: "Files: test/integration/auth.test.ts\nTest: login → access protected route → logout → verify session destroyed\nInclude: Redis failure scenarios",
    status: "pending"
  }
]
```

**notes**:
```
## Key Files Reference

### Core Files
- **`src/middleware/SessionStore.ts`**: Redis session abstraction. Exports SessionStore class. Modify when changing session schema or storage behavior.
- **`src/middleware/session.ts`**: express-session config. Exports configured session middleware. Touch when changing cookie settings or TTL.
- **`src/middleware/auth.ts`**: Authentication middleware. Currently has old `requireAuth` (JWT) and new `requireSession`. Will remove `requireAuth` after migration.
- **`src/controllers/AuthController.ts`**: Login/logout logic. Needs updates to use sessions instead of JWT.
- **`src/config/redis.ts`**: Redis client singleton. Connection config, retry logic. Other code imports from here.

### File Relationships
- `session.ts` imports `SessionStore` from `SessionStore.ts` - session middleware uses store
- `SessionStore.ts` imports Redis client from `config/redis.ts` - store needs Redis connection
- `auth.ts` will import session middleware from `session.ts` - to validate sessions
- `AuthController.ts` imports `SessionStore` directly - to create/destroy sessions on login/logout

### Entry Points
- Main: `src/index.ts` - need to apply session middleware globally here
- Tests: `test/unit/middleware/` - unit tests for SessionStore and middleware
- Integration: `test/integration/auth.test.ts` - full auth flow testing

## Important Context

### Conversation Context
- User emphasized zero downtime during migration (must support both JWT and sessions for transition period)
- User wants "logout from all devices" feature (revoke all sessions for user)
- User mentioned mobile app still uses JWT, can't update immediately (reason for dual support)
- Security audit identified lack of session revocation as critical issue

### Blockers & Issues
- **Redis in Production**: Need DevOps to provision Redis instance. User said "will handle this week", not blocking dev work.
- **Session Secret**: Need secure random secret in production env var. User will generate and add to deployment config.

### Things to Remember
- Session ID is generated by express-session automatically, don't generate manually
- Cookie maxAge is different from Redis TTL - cookie is 7 days, Redis TTL is 24h with sliding
- User model has `email` field (lowercase) not `username` - important for session lookups
- Existing JWT middleware in `auth.ts` must remain functional until migration complete

### Questions & Unknowns
- Should we store user role in session or fetch on each request? (Performance vs security trade-off)
- How to handle Redis connection failures gracefully? Currently returns 503, user may want fallback behavior.

### Error Messages Encountered
- `Redis connection timeout` when Redis not running locally - solved by starting Redis with `redis-server`

### Technical Discoveries
- express-session automatically handles cookie renewal on activity (sliding expiration works automatically)
- connect-redis has built-in connection retry, don't need to implement our own
- Redis SETEX command used for TTL is atomic (no race condition with expiration)
```

## Notes for Implementation

### Comprehensive Context Capture

When pausing work, analyze the **entire conversation** and extract:

1. **Every architectural decision**, even small ones, with reasoning
2. **Every file touched** with its role and key functions
3. **Every technical constraint or discovery**
4. **User preferences and requirements** mentioned
5. **Gotchas, errors, or learning moments**
6. **Current state of partially complete work**
7. **File relationships and dependencies**

### Structure Within Existing Schema

- **`goal`**: Background, context, "why", technical environment, success criteria
- **`decisions`**: ALL decisions (architectural, technical, patterns) with rationale and trade-offs
- **`implementation_plan`**: Highly structured: completed (with files), in-progress (detailed), next steps (with files and considerations)
- **`tasks`**: Actionable items with file context and approach
- **`notes`**: File reference guide, conversation context, blockers, discoveries, things to remember

### Critical Points

- **Self-contained**: Plan must be readable WITHOUT conversation history
- **File-centric**: Always mention specific files - paths, roles, relationships
- **Rationale-focused**: Explain WHY decisions were made, not just WHAT
- **Detail over brevity**: More context is better - err on the side of too much detail
- **Current state**: Capture exactly where we are, including partial work
- **Resumption-focused**: Write for "future you" who forgot everything

## Final Reminder

**You CANNOT invoke slash commands** - only inform user about available commands like `/plan-resume-work`.
