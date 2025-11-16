# Create Comprehensive Implementation Plan

Create a detailed, self-contained implementation plan through conversational information gathering.

## Core Principle

A plan should contain **everything** needed to work autonomously across multiple sessions. Be thorough, ask questions, and confirm the plan is comprehensive before creating it.

## Two Scenarios

This command supports both:
- **Scenario A**: Continuing a conversation - extract context from prior discussion and ask for missing details
- **Scenario B**: Fresh start - gather all information through questions

## Instructions

### Phase 1: Initial Assessment & Information Gathering

#### Step 1: Determine Context

**Check conversation history:**
- Is there prior discussion about what to build?
- Have decisions been made?
- Are there technical details already discussed?

**Respond based on scenario:**

**Scenario A - Continuing Conversation:**
```
I'll help create a comprehensive implementation plan based on our discussion.

Let me start by summarizing what I understand so far:

📋 What We're Building:
{summary of what's been discussed}

🎯 Why We're Doing This:
{purpose/goals mentioned}

🧠 Key Decisions Made:
{architectural/technical decisions from conversation}

📂 Files/Areas Involved:
{any specific files or code areas mentioned}

⚠️ Constraints/Requirements:
{any constraints mentioned}

Is this summary accurate? Are there any corrections or additions?
```

**Scenario B - Fresh Conversation:**
```
I'll help you create a comprehensive implementation plan. To make it as detailed and useful as possible, I need to gather information through a few questions.

Let's start with the basics:

**What are you trying to build or accomplish?**
{Wait for user response}
```

#### Step 2: Ask Clarifying Questions

**Be conversational and thorough.** Ask questions in groups, wait for answers, then ask follow-ups. Don't rush - comprehensive plans need comprehensive information.

**Question Areas (ask about each):**

**A. Background & Context**
```
Let me understand the background better:

1. **Why is this needed?** What problem does it solve?
2. **What led to this work?** (User request, bug, refactor, feature, technical debt?)
3. **What does success look like?** How will we know it's done?
```

**B. Technical Context**
```
Tell me about the technical environment:

1. **What's the tech stack?** (Framework, language, key libraries)
2. **Are there existing systems this integrates with?** (APIs, services, databases)
3. **Any technical constraints I should know?** (Performance requirements, compatibility needs, API limits)
4. **Dependencies?** (What libraries, services, or APIs will we use?)
```

**C. Architectural Decisions**
```
Let's talk about the approach:

1. **What's the core architectural approach?** (How are we solving this?)
2. **Why this approach?** (What alternatives did you consider?)
3. **Are there trade-offs we're accepting?** (What are we giving up/gaining?)
4. **Design patterns or conventions to follow?** (Existing codebase patterns, naming conventions)
```

**D. File & Code Context**
```
Help me understand the codebase:

1. **What files will we modify or create?**
2. **Are there key files I should know about?** (Entry points, core modules)
3. **How do these files relate to each other?** (Imports, dependencies)
4. **Where should I start looking in the codebase?**
```

**E. Implementation Approach**
```
Let's break down the work:

1. **What are the main phases or steps?** (High-level breakdown)
2. **What should be done first?** (Critical path, dependencies)
3. **Are there any parts that can be done in parallel?**
4. **What's the testing strategy?**
```

**F. Important Context & Gotchas**
```
A few more things:

1. **Are there any blockers or unknowns?** (Things we need to figure out)
2. **Important gotchas or things to watch for?**
3. **Any error messages or issues you've encountered?**
4. **Specific requirements or preferences?** (Code style, patterns to follow/avoid)
```

**After each group of questions:**
- Wait for user's response
- Ask follow-up questions to clarify anything unclear
- If user says "I don't know" or "not sure", that's okay - make a note to investigate
- Be conversational: "That helps, let me ask about..." or "Got it! Now about..."

### Phase 2: Build Plan Structure

**As you gather information, organize it mentally into the plan structure:**

**Summary**: 1-2 sentence description of the work

**Goal**: Comprehensive background including:
- What we're building (detailed)
- Why it's needed (business/technical rationale)
- What led to this work (context)
- Technical context (stack, dependencies, constraints, integrations)
- Success criteria (what "done" looks like)

**Decisions**: All decisions with rationale:
- Core architectural approach (decision, rationale, trade-offs, alternatives)
- Technical choices (with reasoning)
- Patterns & conventions
- Design constraints

**Implementation Plan**: Structured breakdown:
- Main phases with specific steps
- What needs to happen in each phase and why
- File-specific details (what files, what changes, why)
- Testing approach
- Dependencies between phases

**Tasks**: Session-sized actionable items (3-7 tasks):
- Each task completable in one session
- Include file context in details
- Note dependencies and approach
- All start as "pending"

**Notes**: Important context:
- Key files with roles and relationships
- Blockers & issues
- Gotchas & things to remember
- Questions & unknowns to investigate
- User preferences mentioned
- Error messages or technical discoveries

### Phase 3: Review & Confirm

**After gathering all information, present what you've compiled:**

```
Great! Let me show you what I've gathered for the plan:

═══════════════════════════════════════════════════════════════
DRAFT IMPLEMENTATION PLAN
═══════════════════════════════════════════════════════════════

📋 Summary:
{1-2 sentence description}

───────────────────────────────────────────────────────────────
🎯 BACKGROUND & GOAL
───────────────────────────────────────────────────────────────

{Display what you'll put in goal field:
 - What we're building
 - Why it's needed
 - Technical context
 - Success criteria}

───────────────────────────────────────────────────────────────
🧠 KEY DECISIONS & RATIONALE
───────────────────────────────────────────────────────────────

{Display what you'll put in decisions field:
 - Core approach with rationale
 - Technical choices
 - Trade-offs
 - Patterns & conventions}

───────────────────────────────────────────────────────────────
📂 IMPLEMENTATION APPROACH
───────────────────────────────────────────────────────────────

{Display what you'll put in implementation_plan field:
 - Phased breakdown
 - Specific steps with files
 - Testing approach}

───────────────────────────────────────────────────────────────
✅ PLANNED TASKS
───────────────────────────────────────────────────────────────

{List the tasks you'll create:
 1. {task summary}
    Files: {files}
    Approach: {approach}

 2. {task summary}
    ...}

───────────────────────────────────────────────────────────────
📝 IMPORTANT NOTES
───────────────────────────────────────────────────────────────

{Display what you'll put in notes field:
 - Key files reference
 - Blockers & gotchas
 - Things to remember
 - Questions & unknowns}

═══════════════════════════════════════════════════════════════

Does this plan capture everything we need?

**Options:**
A. This looks comprehensive - create the plan!
B. Add more detail about: {specific area}
C. I have more context to add...
D. Something needs correction: {what}

What would you like to do?
```

**Handle user response:**

**If user says A (create it):**
→ Proceed to Phase 4 (Create Plan)

**If user says B, C, or D (needs changes):**
→ Ask follow-up questions, gather more detail
→ Update your draft
→ Show updated version
→ Ask for confirmation again
→ Repeat until user says it's comprehensive

**If user says "sufficient" or "ready" or "good enough":**
→ Proceed to Phase 4 (Create Plan)

### Phase 4: Create the Plan

#### Step 1: Generate Plan ID

Create a descriptive kebab-case ID:
- Format: `{main-feature}-{descriptive-suffix}`
- Examples: `redis-session-auth`, `graphql-api-redesign`, `user-profile-feature`
- Must be unique and descriptive

#### Step 2: Create Plan with plan_store

Use the comprehensive structure matching pause-work:

```
plan_store(
  id: "{descriptive-kebab-case-id}",
  summary: "{1-2 sentence description}",

  goal: "## Background & Context

### What We're Building
{Detailed description of what user is trying to accomplish}

### Why It's Needed
{Business/technical rationale - what problem this solves}

### What Led to This Work
{Context: user request, bug, feature, refactor, etc.}

### Technical Context
- Framework/Stack: {tech stack info}
- Key Dependencies: {libraries, services, APIs}
- Constraints: {performance, compatibility, limits}
- Integration Points: {what this connects to}

### Success Criteria
{What 'done' looks like}",

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
- {coding patterns to follow}
- {naming conventions}
- {project-specific conventions}

### Design Constraints
- {limitations influencing decisions}
- {requirements shaping approach}",

  implementation_plan: "## Implementation Overview

### Phase 1: {Phase Name}

#### Steps
1. {Specific step} - {why needed}
   - Files: `{files}`
   - Approach: {how}

2. {Specific step} - {why needed}
   - Files: `{files}`
   - Approach: {how}

### Phase 2: {Phase Name}

#### Steps
1. {Specific step}
   - Files: `{files}`
   - Considerations: {what to watch}

### Phase N: Testing & Validation

#### Steps
1. {Testing approach}
2. {Validation steps}",

  tasks: [
    {
      summary: "{task 1 - session-sized, actionable}",
      details: "Files: {files}\nApproach: {how}\nConsiderations: {gotchas}",
      status: "pending"
    },
    {
      summary: "{task 2}",
      details: "Files: {files}\nWhy: {rationale}\nDependencies: {what's needed first}",
      status: "pending"
    },
    // 3-7 tasks typically, each completable in one session
  ],

  notes: "## Key Files Reference

### Core Files
- **`{file}`**: {role, key exports, when to modify}
- **`{file}`**: {role, dependencies, important details}

### File Relationships
- `{file}` imports from `{file}` - {why}
- `{file}` depends on `{file}` - {relationship}

### Entry Points
- Main: `{file}` - {what it does}
- Tests: `{file}` - {coverage}

## Important Context

### Blockers & Issues
- **{Blocker}**: {description and what's needed to unblock}
- **{Issue}**: {details and potential solutions}

### Things to Remember
- {Important gotchas}
- {Codebase quirks}
- {Patterns to follow or avoid}

### Questions & Unknowns
- {Question to investigate}
- {Uncertainty about approach}
- {Things to verify}

### User Preferences
- {Specific requirements mentioned}
- {Preferences expressed}
- {Important conversation context}

### Technical Discoveries
- {Performance characteristics}
- {API behaviors}
- {Library quirks}",

  status: "planning"
)
```

#### Step 3: Display Created Plan

Show comprehensive confirmation:

```
✓ Comprehensive implementation plan created!

═══════════════════════════════════════════════════════════════
PLAN CREATED
═══════════════════════════════════════════════════════════════

📋 {summary}
🆔 ID: {id}
📊 Status: planning
📝 {N} tasks defined

───────────────────────────────────────────────────────────────
🎯 BACKGROUND & GOAL
───────────────────────────────────────────────────────────────

{Display goal field content - show key points}

───────────────────────────────────────────────────────────────
🧠 KEY DECISIONS
───────────────────────────────────────────────────────────────

{Display key decisions - show main points}

───────────────────────────────────────────────────────────────
📂 IMPLEMENTATION APPROACH
───────────────────────────────────────────────────────────────

{Display implementation plan - show phase structure}

───────────────────────────────────────────────────────────────
✅ TASK LIST
───────────────────────────────────────────────────────────────

{List all tasks:
 1. [pending] {task summary}
 2. [pending] {task summary}
 ...}

───────────────────────────────────────────────────────────────
📝 IMPORTANT NOTES
───────────────────────────────────────────────────────────────

{Show key notes - files, blockers, gotchas}

═══════════════════════════════════════════════════════════════

This plan will persist across sessions and can be:
• Started now (see options below)
• Resumed later with: /plan-resume-work
• Paused anytime with: /plan-pause-work
• Searched with: plan_search(id="{id}")

───────────────────────────────────────────────────────────────

Would you like to start working on this plan now? [Yes/No]
```

### Phase 5: Handle Next Steps

**If user says Yes:**

1. Update plan to `in_progress`:
   ```
   plan_update(id: "{plan-id}", plan_status: "in_progress")
   ```

2. Display confirmation:
   ```
   ✓ Plan activated!

   Starting work on: {summary}
   First task: {first task summary}

   Let me begin implementation...
   ```

3. **IMMEDIATELY start working autonomously:**
   - Use ALL the context gathered (decisions, files, technical details)
   - Follow the implementation plan phases
   - Use the documented architectural approach
   - Reference file details from notes
   - Watch for gotchas mentioned
   - Mark tasks complete as you finish them:
     ```
     plan_update(
       id: "{plan-id}",
       task_updates=[{index: 0, status: "completed"}]
     )
     ```
   - Add notes for discoveries:
     ```
     plan_update(
       id: "{plan-id}",
       add_note: "Discovered X while implementing Y - adjusted approach..."
     )
     ```

**If user says No:**
```
No problem! Your comprehensive plan has been saved with status "planning".

Plan ID: {id}

When you're ready to start:
• /plan-resume-work - Resume this or other plans
• plan_search(id="{id}") - Retrieve this specific plan
• plan_search(query="{keywords}") - Search for plans

The plan contains all the context and decisions we discussed, so you can resume anytime!
```

Then STOP - do not take further action.

## Example: Fresh Conversation Flow

```
User: /plan-create

Claude: I'll help you create a comprehensive implementation plan. To make it as detailed and useful as possible, I need to gather information through a few questions.

Let's start with the basics:

**What are you trying to build or accomplish?**

User: I want to add user authentication to my app using OAuth

Claude: Got it! Let me understand the background better:

1. **Why is this needed?** What problem does it solve?
2. **What led to this work?** Is this a new feature, user request, or security requirement?
3. **What does success look like?** How will we know it's done?

User: We need users to log in with Google or GitHub. It's a user request because we're moving from a prototype to production. Success is when users can log in with either provider and access their profile.

Claude: Perfect! Tell me about the technical environment:

1. **What's the tech stack?** (Framework, language, key libraries)
2. **Are there existing systems this integrates with?**
3. **Any technical constraints I should know?**
4. **Dependencies?** (What OAuth libraries will we use?)

User: We're using Next.js 14 with TypeScript. We have an existing user database in PostgreSQL. We want to use NextAuth.js for OAuth. No major constraints.

Claude: Great! Let's talk about the approach:

1. **What's the core architectural approach?** How are we solving this?
2. **Why NextAuth.js specifically?** What alternatives did you consider?
3. **Are there trade-offs we're accepting?**

User: NextAuth.js handles OAuth flow and session management. We considered building it ourselves but NextAuth is mature and well-tested. The trade-off is dependency on a library but we gain security and time savings.

Claude: Excellent! Help me understand the codebase:

1. **What files will we modify or create?**
2. **Are there key files I should know about?**
3. **Where should I start looking?**

User: Main files are in src/app. We'll need to create api/auth/[...nextauth]/route.ts for NextAuth. We have a User model in src/models/user.ts. The login button is in src/components/Header.tsx.

Claude: Perfect! Let's break down the work:

1. **What are the main phases?**
2. **What should be done first?**
3. **What's the testing strategy?**

User: First set up NextAuth config, then add OAuth providers, then integrate with our User model, then update the UI. Testing should cover login flow and session persistence.

Claude: A few more things:

1. **Any blockers or unknowns?**
2. **Important gotchas or things to watch for?**
3. **Specific requirements or preferences?**

User: We need OAuth credentials from Google and GitHub. Gotcha: make sure to handle the case where user emails don't match between providers. We want to use TypeScript strictly, no any types.

Claude: Excellent! Let me show you what I've gathered for the plan:

═══════════════════════════════════════════════════════════════
DRAFT IMPLEMENTATION PLAN
═══════════════════════════════════════════════════════════════

📋 Summary:
Implement OAuth authentication with Google and GitHub using NextAuth.js

───────────────────────────────────────────────────────────────
🎯 BACKGROUND & GOAL
───────────────────────────────────────────────────────────────

## Background & Context

### What We're Building
OAuth-based authentication system allowing users to log in with Google or GitHub accounts, integrated with existing PostgreSQL user database.

### Why It's Needed
Moving from prototype to production - users need secure authentication. User request for social login capabilities.

### What Led to This Work
User feature request as part of production readiness

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
- **Rationale**: Mature, well-tested library that handles OAuth complexity and security
- **Trade-offs**: Dependency on external library vs time savings and security benefits
- **Alternatives Considered**: Building OAuth flow manually (rejected due to complexity and security risks)

### Technical Choices
- **OAuth Providers**: Google and GitHub (user requirements)
- **Session Strategy**: Database sessions (integrate with existing PostgreSQL)
- **Type Safety**: Strict TypeScript, no any types

### Patterns & Conventions
- NextAuth.js file-based routing (`api/auth/[...nextauth]/route.ts`)
- Session callbacks for custom user data
- Adapter pattern for PostgreSQL integration

### Design Constraints
- Must integrate with existing User model
- Must handle email mismatches between providers
- Must follow Next.js 14 app router conventions

───────────────────────────────────────────────────────────────
📂 IMPLEMENTATION APPROACH
───────────────────────────────────────────────────────────────

## Phase 1: NextAuth Setup & Configuration

1. Install NextAuth.js and dependencies
   - Files: `package.json`
   - Install: next-auth, @next-auth/postgresql-adapter

2. Create NextAuth API route
   - Files: `src/app/api/auth/[...nextauth]/route.ts`
   - Configure base NextAuth setup

3. Set up environment variables
   - Files: `.env.local`
   - Add: NEXTAUTH_URL, NEXTAUTH_SECRET

## Phase 2: OAuth Provider Configuration

1. Obtain OAuth credentials
   - Google Cloud Console: Create OAuth client
   - GitHub Settings: Create OAuth app
   - Add credentials to environment

2. Configure providers in NextAuth
   - Files: `src/app/api/auth/[...nextauth]/route.ts`
   - Add Google and GitHub provider configs

## Phase 3: Database Integration

1. Set up PostgreSQL adapter
   - Files: `src/app/api/auth/[...nextauth]/route.ts`
   - Configure adapter for existing User model

2. Handle user creation/lookup
   - Files: `src/app/api/auth/[...nextauth]/route.ts`
   - Implement callbacks for user matching
   - Handle email mismatch case

## Phase 4: UI Integration

1. Add login/logout buttons
   - Files: `src/components/Header.tsx`
   - Use NextAuth signIn/signOut functions

2. Add session provider
   - Files: `src/app/layout.tsx`
   - Wrap app with SessionProvider

3. Protect routes
   - Files: Create `src/middleware.ts`
   - Add auth middleware for protected pages

## Phase 5: Testing

1. Test OAuth flow for both providers
2. Test session persistence
3. Test email mismatch handling
4. Test protected route access

───────────────────────────────────────────────────────────────
✅ PLANNED TASKS
───────────────────────────────────────────────────────────────

1. Install NextAuth.js and set up basic configuration
   Files: package.json, src/app/api/auth/[...nextauth]/route.ts, .env.local
   Approach: Install dependencies, create API route, configure base settings

2. Obtain and configure OAuth credentials for Google and GitHub
   Files: .env.local, src/app/api/auth/[...nextauth]/route.ts
   Approach: Register apps with providers, add credentials, configure provider settings

3. Integrate NextAuth with PostgreSQL and User model
   Files: src/app/api/auth/[...nextauth]/route.ts, src/models/user.ts
   Approach: Set up adapter, implement user callbacks, handle email matching

4. Add authentication UI components and session provider
   Files: src/components/Header.tsx, src/app/layout.tsx, src/middleware.ts
   Approach: Add login/logout buttons, wrap app with provider, protect routes

5. Test complete authentication flow and edge cases
   Files: Create test files in src/__tests__
   Approach: Test both providers, session persistence, email mismatch, protected routes

───────────────────────────────────────────────────────────────
📝 IMPORTANT NOTES
───────────────────────────────────────────────────────────────

## Key Files Reference

### Core Files
- **`src/app/api/auth/[...nextauth]/route.ts`**: NextAuth configuration - providers, callbacks, adapter
- **`src/models/user.ts`**: Existing User model - will be integrated with OAuth
- **`src/components/Header.tsx`**: Contains login UI - will add auth buttons
- **`src/app/layout.tsx`**: App layout - will wrap with SessionProvider
- **`src/middleware.ts`**: (New) Route protection middleware

### File Relationships
- NextAuth route uses User model for database operations
- Header component uses NextAuth client functions
- Layout wraps app with SessionProvider
- Middleware protects routes using session checks

### Entry Points
- Main: NextAuth API route handles all auth flow
- UI: Header component for user interaction
- Tests: Will create in src/__tests__/auth

## Important Context

### Blockers & Issues
- **OAuth Credentials**: Need to register apps with Google and GitHub before testing
- **Environment Variables**: Need NEXTAUTH_SECRET generated (use `openssl rand -base64 32`)

### Things to Remember
- **Email Mismatch**: Handle case where user's email differs between Google and GitHub
- **Type Safety**: Must use proper TypeScript types, no any types
- **Next.js 14**: Use app router conventions (not pages router)
- **Session Strategy**: Using database sessions (not JWT) for better control

### Questions & Unknowns
- How to handle email mismatches? (Link accounts? Separate users? - need to decide during implementation)
- Session expiration time? (Default to 30 days or customize?)

### User Preferences
- Strict TypeScript enforcement
- Production-ready security
- Social login for better UX

═══════════════════════════════════════════════════════════════

Does this plan capture everything we need?

**Options:**
A. This looks comprehensive - create the plan!
B. Add more detail about: {specific area}
C. I have more context to add...
D. Something needs correction: {what}

What would you like to do?

User: A

Claude: [Creates plan with plan_store using all gathered information]

✓ Comprehensive implementation plan created!

═══════════════════════════════════════════════════════════════
PLAN CREATED
═══════════════════════════════════════════════════════════════

📋 Implement OAuth authentication with Google and GitHub using NextAuth.js
🆔 ID: oauth-authentication-nextauth
📊 Status: planning
📝 5 tasks defined

{... displays full plan details ...}

═══════════════════════════════════════════════════════════════

This plan will persist across sessions and can be:
• Started now (see options below)
• Resumed later with: /plan-resume-work
• Paused anytime with: /plan-pause-work
• Searched with: plan_search(id="oauth-authentication-nextauth")

───────────────────────────────────────────────────────────────

Would you like to start working on this plan now? [Yes/No]

User: Yes

Claude: [Updates plan to in_progress]

✓ Plan activated!

Starting work on: Implement OAuth authentication with Google and GitHub using NextAuth.js
First task: Install NextAuth.js and set up basic configuration

Let me begin implementation...

[Immediately starts installing packages and setting up NextAuth]

I'll start by installing the necessary dependencies:
- next-auth: Core NextAuth.js library
- @next-auth/postgresql-adapter: Database adapter for our PostgreSQL setup

[Continues working autonomously through the plan...]
```

## Example: Continuing Conversation Flow

```
[Context: User has been discussing adding Redis caching for API responses]

User: /plan-create

Claude: I'll help create a comprehensive implementation plan based on our discussion.

Let me start by summarizing what I understand so far:

📋 What We're Building:
Redis-based caching layer for API responses to improve performance

🎯 Why We're Doing This:
API response times are too slow (averaging 500ms), need to reduce to under 100ms

🧠 Key Decisions Made:
- Using Redis for cache storage (fast, TTL support)
- Cache at API route level (before database queries)
- 5-minute TTL for most endpoints, 1-hour for static data

📂 Files/Areas Involved:
- src/app/api routes - will add caching middleware
- Redis connection configuration
- Potentially need cache invalidation strategy

⚠️ Constraints/Requirements:
- Must work with existing Next.js API routes
- Need to handle cache invalidation on updates
- Redis must be optional (fallback if Redis unavailable)

Is this summary accurate? Are there any corrections or additions?

User: Yes, that's accurate. Also we want to cache user profile data separately from other data.

Claude: Great! Let me gather a bit more detail:

1. **For user profiles**, what's the appropriate TTL? Same 5 minutes or different?
2. **Cache invalidation**: When user updates their profile, should we invalidate immediately or let TTL expire?
3. **Redis setup**: Do we have Redis running locally for dev? What about production?

User: User profiles can have 10-minute TTL. Invalidate immediately on update. We have Redis locally, and we'll use Redis Cloud in production.

Claude: Perfect! A few more questions:

1. **Are there specific API routes we should prioritize** for caching?
2. **Cache key strategy**: How should we structure cache keys? (e.g., `api:users:123`, `api:posts:456`)
3. **Error handling**: If Redis is down, should we log errors silently or alert?

User: Prioritize /api/users/[id] and /api/posts. Cache keys should be route-based like `api:route:params`. Log errors but don't alert.

Claude: Excellent! Last few things:

1. **Are there any files I should know about** for the Redis connection? Existing config patterns?
2. **Dependencies**: Should I use ioredis or node-redis?
3. **Any gotchas or things to watch for** in your codebase?

User: No existing Redis config. Use ioredis - we use it elsewhere. Watch out: our API routes use route handlers (Next.js 14 app router), not pages API routes.

Claude: Perfect! Let me show you the comprehensive plan I've put together:

═══════════════════════════════════════════════════════════════
DRAFT IMPLEMENTATION PLAN
═══════════════════════════════════════════════════════════════

📋 Summary:
Implement Redis-based caching layer for API routes to reduce response times from 500ms to under 100ms

{... shows full comprehensive plan structure ...}

═══════════════════════════════════════════════════════════════

Does this plan capture everything we need?

**Options:**
A. This looks comprehensive - create the plan!
B. Add more detail about: {specific area}
C. I have more context to add...
D. Something needs correction: {what}

What would you like to do?

User: Looks good, create it!

Claude: [Creates comprehensive plan]

✓ Comprehensive implementation plan created!

{... displays created plan ...}

Would you like to start working on this plan now? [Yes/No]

{... continues based on user response ...}
```

## Critical Guidelines

### Be Thorough
- Don't rush the information gathering
- Ask follow-up questions when answers are vague
- It's okay to ask "why" multiple times
- Better to over-gather than under-gather

### Be Conversational
- Use natural language, not robotic
- Acknowledge responses: "Great!", "Perfect!", "Got it!"
- Build on previous answers
- Show you're listening and understanding

### Match Comprehensive Structure
- Use the same detailed structure as pause-work
- Include file details, relationships, roles
- Capture rationale and trade-offs
- Document gotchas and discoveries
- Make plan self-contained

### Confirm Before Creating
- Always show draft plan
- Get explicit confirmation
- Allow for additions/corrections
- Only create when user says it's sufficient

### Support Both Scenarios
- Check conversation context first
- If there's prior discussion, summarize and ask for gaps
- If fresh start, ask comprehensive questions
- Either way, end with the same thorough plan

## Notes

- This command is for LARGE, COMPLEX tasks spanning multiple sessions
- For simple tasks, just use TodoWrite - don't overcomplicate
- Be conversational and patient - good plans take time
- The plan persists across sessions - invest in making it comprehensive
- Status starts as `"planning"`, moves to `"in_progress"` if user starts immediately
- **You CANNOT invoke slash commands** - only suggest them to user
