# Planner Tool Documentation

Implementation planning system with task management and hybrid search capabilities for Claude Code.

## Overview

The Planner tool enables Claude Code to create, track, and search implementation plans with structured tasks and progress tracking. It also provides powerful **work session management** capabilities for preserving context across work sessions.

### Key Features

- **Plan Creation** - Create detailed implementation plans with goals and notes
- **Task Management** - Break plans into trackable tasks with status
- **Hybrid Search** - Find plans using keyword + semantic search
- **Status Tracking** - Track plan progress (planning, in_progress, completed, on_hold)
- **Task Completion** - Mark tasks complete with timestamps
- **Context Retrieval** - Search across plan titles, descriptions, and tasks
- **Work Session Management** - Save and resume work context via slash commands:
  - `/plan-create` - Convert conversation into comprehensive tracked plan
  - `/plan-pause-work` - Save current work session to resume later
  - `/plan-resume-work` - Load and continue a paused work session
  - See [SLASH_COMMANDS.md](./SLASH_COMMANDS.md) for details

## Storage

- **Directory:** `cc-devtools/plans/`
- **Format:** One YAML file per plan (`{plan-id}.yaml`)
- **Created:** Automatically on first use
- **Version Control:** Should be committed to git
- **Cache:** `cc-devtools/.cache/planner-embeddings.msgpack` (gitignored, auto-regenerated, MessagePack format)

## MCP Tools

### `plan_store`

Create a new implementation plan with goals and tasks.

**Parameters:**
- `title` (required, string) - Plan title
- `description` (required, string) - Detailed plan description
- `goals` (required, string[]) - List of goals to accomplish
- `implementation_notes` (optional, string) - Implementation approach notes
- `tasks` (optional, array) - Initial tasks with title and description

**Returns:**
```json
{
  "success": true,
  "plan": {
    "id": "uuid-string",
    "title": "Implement user authentication",
    "description": "Add complete user auth system...",
    "goals": ["User registration", "Login flow", "Password reset"],
    "status": "planning",
    "tasks": [...],
    "created_at": 1696723200,
    "updated_at": 1696723200
  },
  "message": "Plan created successfully"
}
```

**Example:**
```json
{
  "title": "Implement user authentication system",
  "description": "Add complete authentication with email/password, JWT tokens, and password reset functionality",
  "goals": [
    "User can register with email/password",
    "User can login and receive JWT token",
    "User can reset forgotten password"
  ],
  "implementation_notes": "Use bcrypt for password hashing, JWT with 1h expiration, email service for password reset",
  "tasks": [
    {
      "title": "Create user database schema",
      "description": "Design and implement user table with email, password hash, timestamps"
    },
    {
      "title": "Implement registration endpoint",
      "description": "POST /api/register with validation and password hashing"
    }
  ]
}
```

### `plan_search`

Search plans using hybrid keyword + semantic search.

**Parameters:**
- `query` (required, string) - Search query
- `status` (optional, string) - Filter by status (planning, in_progress, completed, on_hold)
- `limit` (optional, number) - Maximum results to return (default: 5)
- `includeCompleted` (optional, boolean) - Include completed plans (default: true)

**Returns:**
```json
{
  "results": [
    {
      "plan": {
        "id": "uuid-string",
        "title": "Implement user authentication",
        "description": "Add complete auth system...",
        "status": "in_progress",
        "goals": [...],
        "tasks": [...],
        "created_at": 1696723200,
        "updated_at": 1696723300
      },
      "score": 0.87,
      "matchType": "semantic"
    }
  ],
  "query": "original search query",
  "totalResults": 3
}
```

**Match Types:**
- `keyword` - Matched via keyword search
- `semantic` - Matched via embedding similarity
- `both` - Matched by both methods

### `plan_update`

Update plan status or mark tasks as complete.

**Parameters:**
- `id` (required, string) - Plan ID
- `status` (optional, string) - New plan status
- `completedTasks` (optional, number[]) - Array of task indices to mark complete

**Returns:**
```json
{
  "success": true,
  "plan": {
    "id": "uuid-string",
    "status": "in_progress",
    "tasks": [
      {
        "title": "Create user schema",
        "status": "completed",
        "completed_at": 1696723400
      }
    ],
    "updated_at": 1696723400
  },
  "message": "Plan updated successfully"
}
```

**Example:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "in_progress",
  "completedTasks": [0, 1]
}
```

## Data Schema

### Plan Object

```yaml
id: "550e8400-e29b-41d4-a716-446655440000"
title: "Implement user authentication system"
description: |
  Add complete authentication with email/password,
  JWT tokens, and password reset functionality
goals:
  - User can register with email/password
  - User can login and receive JWT token
  - User can reset forgotten password
status: in_progress
implementation_notes: |
  Use bcrypt for password hashing
  JWT with 1h expiration
  Email service for password reset
tasks:
  - title: "Create user database schema"
    description: "Design and implement user table"
    status: pending
  - title: "Implement registration endpoint"
    description: "POST /api/register with validation"
    status: completed
    completed_at: 1696723400
created_at: 1696723200
updated_at: 1696723400
```

**Fields:**
- `id` - UUID identifier (auto-generated)
- `title` - Plan title (descriptive, ~50-100 chars)
- `description` - Detailed plan description (can be multi-line)
- `goals` - Array of goal statements
- `status` - Current status (planning, in_progress, completed, on_hold)
- `implementation_notes` - Optional implementation approach notes
- `tasks` - Array of task objects
- `created_at` - Unix timestamp (seconds since epoch)
- `updated_at` - Unix timestamp (seconds since epoch)

### Task Object

```yaml
- title: "Create user database schema"
  description: "Design and implement user table with email, password hash"
  status: pending  # or completed
  completed_at: 1696723400  # only when status is completed
```

**Fields:**
- `title` - Task title (clear, actionable)
- `description` - Task description (detailed instructions)
- `status` - Current status (pending or completed)
- `completed_at` - Timestamp when marked complete (optional)

## Plan Statuses

### `planning`
- **Meaning:** Plan is being drafted, not yet started
- **Use Case:** Initial brainstorming and task definition
- **Next Step:** Move to `in_progress` when ready to start

### `in_progress`
- **Meaning:** Actively working on implementing the plan
- **Use Case:** Tasks are being completed, progress is being made
- **Next Step:** Move to `completed` when all goals achieved

### `completed`
- **Meaning:** Plan fully implemented and goals achieved
- **Use Case:** All tasks done, implementation working
- **Next Step:** Archive or keep for reference

### `on_hold`
- **Meaning:** Plan paused via `/plan-pause-work`, waiting to be resumed
- **Use Case:** Pausing work session to continue later, or blocked by external factors
- **Next Step:** Resume to `in_progress` using `/plan-resume-work` when ready to continue

## Search Algorithm

The hybrid search combines two approaches:

### 1. Keyword Search
- Searches across plan title, description, goals, and tasks
- Case-insensitive word matching
- Matches any plan containing query keywords

### 2. Semantic Search
- Generates embedding for search query
- Compares against plan embeddings
- Calculates cosine similarity (0-1)
- Returns semantically related plans

### Ranking
- Combines results from both methods
- Sorted by relevance score
- Filters by status if requested
- Limited to requested number of results

## Embedding Model

Uses `Xenova/all-MiniLM-L6-v2` transformer model:
- **Dimensions:** 384
- **License:** Apache 2.0
- **Speed:** Fast, runs locally
- **Size:** ~90MB download on first use
- **Cache:** `~/.cache/huggingface/` (reused across projects)

## Best Practices

### Creating Plans
- Use clear, descriptive titles
- Include detailed descriptions with context
- Define specific, measurable goals
- Break work into manageable tasks
- Add implementation notes for approach guidance

### Writing Good Titles
```
✅ Good: "Implement user authentication system"
✅ Good: "Refactor database query layer"
✅ Good: "Add real-time notification service"

❌ Bad: "Auth stuff"
❌ Bad: "Fix database"
❌ Bad: "Notifications"
```

### Defining Goals
```
✅ Good:
- User can register with email/password
- User can login and receive JWT token
- Passwords are hashed with bcrypt

❌ Bad:
- Authentication
- Security
- User stuff
```

### Writing Tasks
```
✅ Good:
Title: "Create user database schema"
Description: "Design user table with email (unique), password_hash,
created_at, updated_at. Add indexes on email."

❌ Bad:
Title: "Database"
Description: "Make the database"
```

### Plan Lifecycle
1. **Create** plan with `planning` status
2. **Define** all tasks and goals clearly
3. **Start** by changing status to `in_progress`
4. **Complete** tasks incrementally using `plan_update`
5. **Finish** by marking plan as `completed`

## Use Cases

### Feature Implementation
```json
{
  "title": "Add file upload functionality",
  "description": "Enable users to upload and manage files with cloud storage integration",
  "goals": [
    "Users can upload files up to 10MB",
    "Files are stored in S3 with unique IDs",
    "Users can list and delete their files"
  ],
  "implementation_notes": "Use multer for upload handling, AWS SDK for S3 integration, implement presigned URLs for downloads",
  "tasks": [
    {"title": "Set up S3 bucket and IAM permissions", "description": "..."},
    {"title": "Create file upload endpoint", "description": "..."},
    {"title": "Implement file listing endpoint", "description": "..."}
  ]
}
```

### Refactoring Projects
```json
{
  "title": "Refactor authentication middleware",
  "description": "Improve auth middleware with better error handling and token validation",
  "goals": [
    "Cleaner error messages for auth failures",
    "Proper JWT validation with expiry checks",
    "Unit tests with 90% coverage"
  ],
  "tasks": [
    {"title": "Extract validation logic to separate module", "description": "..."},
    {"title": "Add comprehensive error handling", "description": "..."},
    {"title": "Write unit tests for all paths", "description": "..."}
  ]
}
```

### Bug Fix Campaigns
```json
{
  "title": "Fix memory leaks in WebSocket connections",
  "description": "Investigate and fix memory leaks causing server crashes",
  "goals": [
    "Identify all leak sources",
    "Implement proper cleanup on disconnect",
    "Verify with load testing"
  ],
  "tasks": [
    {"title": "Profile server under load to identify leaks", "description": "..."},
    {"title": "Fix event listener cleanup", "description": "..."},
    {"title": "Add connection timeout handling", "description": "..."}
  ]
}
```

## Troubleshooting

### Search Returns No Results

**Check:**
1. Plans exist - Check `cc-devtools/plans/` directory
2. Query specificity - Try broader or more specific terms
3. Status filter - Remove status filter to search all plans
4. Completed filter - Set `includeCompleted: true`

### Cannot Update Plan

**Common Issues:**
1. **Invalid plan ID** - Verify plan exists
2. **Invalid status** - Use: planning, in_progress, completed, on_hold
3. **Invalid task indices** - Task indices are 0-based
4. **File locked** - Another process is modifying the plan

### Data File Corruption

If plan YAML files become corrupted:
1. Check YAML syntax with validator
2. Restore from git history
3. Verify required fields (id, title, description, goals, status, tasks)
4. Regenerate embeddings cache (will auto-rebuild)

## Integration with Claude Code

The Planner tool enables Claude Code to:

1. **Track Implementation** - Create structured plans for features
2. **Break Down Work** - Define clear tasks and goals
3. **Monitor Progress** - Track task completion and plan status
4. **Find Context** - Search past plans for reference
5. **Maintain History** - Keep record of implementation approaches

## Implementation Details

See [planner_implementation.md](./planner_implementation.md) for technical details:
- Plan storage structure
- Search algorithm implementation
- Task management logic
- Performance characteristics

## Related Documentation

- [Implementation Details](./planner_implementation.md) - Technical deep dive
- [Main README](../../README.md) - Package documentation
- [CHANGELOG](../../CHANGELOG.md) - Version history

## Support

- **Issues:** [GitHub Issues](https://github.com/shaenchen/cc-devtools/issues)
- **Main Documentation:** [cc-devtools README](../../README.md)
