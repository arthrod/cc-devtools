# Kanban CLI Commands

The Kanban tool provides a comprehensive CLI for managing stories and subtasks through unified commands that operate on the YAML storage.

## Architecture

The CLI is organized with clean separation between command layer and domain logic:

```
src/
├── cli/commands/kanban/          # CLI layer
│   ├── core/
│   │   ├── parser.ts            # Argument parsing
│   │   └── response.ts          # JSON response builders
│   ├── index.ts                 # Command router
│   ├── get.ts                   # Get story/subtask details
│   ├── list.ts                  # List and filter stories
│   ├── move.ts                  # Move story/subtask status
│   ├── update-story.ts          # Update story fields
│   ├── update-subtask.ts        # Update subtask fields
│   ├── append-story-field.ts    # Append to story fields
│   ├── append-subtask-field.ts  # Append to subtask fields
│   ├── next.ts                  # Find next work item
│   ├── create-stories.ts        # Bulk create stories
│   ├── create-subtasks.ts       # Bulk create subtasks
│   ├── validate.ts              # Validate status moves
│   ├── stats.ts                 # Get statistics
│   ├── init.ts                  # Initialize system
│   ├── delete-story.ts          # Delete story
│   ├── delete-subtask.ts        # Delete subtask
│   ├── search.ts                # Hybrid search (keyword + semantic)
│   ├── add-review.ts            # Add review feedback
│   ├── get-review.ts            # Get review feedback
│   └── get-round-reviewers.ts   # Get reviewers by round
│
└── kanban/                       # Domain logic (library)
    ├── core/types.ts            # Type definitions
    ├── lib/                     # Business logic
    │   ├── storage.ts           # YAML read/write
    │   ├── validation.ts        # Validation rules
    │   ├── query.ts             # Query/filter logic
    │   ├── formatters.ts        # Display formatting
    │   ├── recommendation.ts    # Work recommendations
    │   └── errors.ts            # Error handling
    ├── services/                # Advanced services
    │   └── search.ts            # Hybrid search service
    └── tools/                   # MCP tools
        ├── get-work-item.ts
        └── update-work-item.ts
```

## Commands

All commands output JSON for programmatic consumption. Use `--pretty` for human-readable output.

### list

List and filter stories with flexible criteria.

```bash
# List all stories
npx cc-devtools kanban list

# Filter by status
npx cc-devtools kanban list --filter=todo
npx cc-devtools kanban list --filter=in_progress
npx cc-devtools kanban list --filter=current  # Current in-progress work

# Filter by phase
npx cc-devtools kanban list --phase=MVP
npx cc-devtools kanban list --phase=BETA

# Filter by business value
npx cc-devtools kanban list --value=L
npx cc-devtools kanban list --value=XL

# Filter by label
npx cc-devtools kanban list --label=bug
npx cc-devtools kanban list --label=feature

# Pretty output
npx cc-devtools kanban list --pretty
```

**Output:**
```json
{
  "success": true,
  "command": "list",
  "data": {
    "stories": [...],
    "formatted": [...],
    "grouped": {
      "todo": [...],
      "in_progress": [...]
    },
    "summary": {
      "total": 10,
      "byStatus": { "todo": 5, "in_progress": 2 },
      "byPhase": { "MVP": 7, "BETA": 3 },
      "byValue": { "L": 4, "M": 6 }
    }
  }
}
```

### get

Get detailed information about a story or subtask. Returns condensed format by default to prevent output truncation.

```bash
# Get story details (condensed - default)
npx cc-devtools kanban get MVP-001

# Get full output with all fields
npx cc-devtools kanban get MVP-001 --full

# Get specific verbose field only
npx cc-devtools kanban get MVP-001 --field=implementation_notes
npx cc-devtools kanban get MVP-001 --field=planning_notes

# Get subtask details
npx cc-devtools kanban get MVP-001-1

# Pretty output
npx cc-devtools kanban get MVP-001 --pretty
```

**Output Modes:**

**Condensed (default)** - Omits verbose fields to prevent truncation:
- Story: Includes `id`, `title`, `status`, `business_value`, `phase`, `subtasks_count`, `effort_estimation_hours`, `labels`, `dependent_upon`, `acceptance_criteria`
- Story: Omits `details`, `planning_notes`, `implementation_notes`, `relevant_documentation`
- Subtask: Includes `id`, `title`, `description`, `status`, `effort_estimation_hours`, `dependent_upon`, `acceptance_criteria`
- Subtask: Omits `details`, `planning_notes`, `implementation_notes`, `relevant_documentation`
- **Note:** A `warning` field is included in condensed output listing the hidden fields and how to access them

**Full** - Returns all fields including verbose ones (no warning field)

**Field** - Returns only the specified verbose field (details, planning_notes, implementation_notes, relevant_documentation)

**Output (condensed):**
```json
{
  "success": true,
  "command": "get",
  "data": {
    "type": "story",
    "item": {
      "id": "MVP-001",
      "title": "Implement authentication",
      "status": "in_progress",
      "business_value": "L",
      "phase": "MVP",
      "subtasks_count": 5,
      "effort_estimation_hours": 16,
      "labels": ["backend", "security"],
      "dependent_upon": [],
      "acceptance_criteria": ["User can login", "Passwords are hashed"]
    },
    "formatted": "...",
    "progress": {
      "complete": 2,
      "total": 5,
      "percentage": 40
    },
    "subtasks": [...],
    "nextActions": [
      "Start next subtask: MVP-001-3"
    ],
    "warning": "Condensed output: Some fields are hidden. Use --full to see all fields including: description, details, planning_notes, implementation_notes, relevant_documentation, completion_timestamp, updated_at"
  }
}
```

**Output (field mode):**
```json
{
  "success": true,
  "command": "get",
  "data": {
    "type": "story",
    "id": "MVP-001",
    "field": "implementation_notes",
    "value": "Used JWT library for authentication. Implemented session refresh logic..."
  }
}
```

### move

Move a story or subtask to a new status with validation.

```bash
# Move story
npx cc-devtools kanban move MVP-001 in_progress
npx cc-devtools kanban move MVP-001 done

# Move subtask
npx cc-devtools kanban move MVP-001-1 done

# Add implementation note
npx cc-devtools kanban move MVP-001 in_progress --note="Starting implementation"
npx cc-devtools kanban move MVP-001-1 done --note="Completed login form"
```

**Validation:**
- Ensures valid status transitions
- Checks subtasks are complete before moving story to review/done
- Validates max stories in progress (from workflow rules)
- Enforces parent story status for subtask moves

**Output:**
```json
{
  "success": true,
  "command": "move",
  "data": {
    "id": "MVP-001",
    "type": "story",
    "oldStatus": "todo",
    "newStatus": "in_progress",
    "timestamp": "2025-10-08T...",
    "allSubtasksComplete": false,
    "nextSuggestion": "Work on subtasks"
  }
}
```

### update-story

Update story fields (excluding status, which should use `move`).

```bash
# Update story title
npx cc-devtools kanban update-story MVP-001 --title="New story title"

# Update description
npx cc-devtools kanban update-story MVP-001 --description="Updated description"

# Update extended details
npx cc-devtools kanban update-story MVP-001 --details="Extended technical details"

# Update phase
npx cc-devtools kanban update-story MVP-001 --phase=BETA

# Update business value
npx cc-devtools kanban update-story MVP-001 --business_value=XL

# Update effort estimation
npx cc-devtools kanban update-story MVP-001 --effort=16

# Update labels (comma-separated)
npx cc-devtools kanban update-story MVP-001 --labels=urgent,backend,security

# Update dependencies (comma-separated)
npx cc-devtools kanban update-story MVP-002 --dependent_upon=MVP-001,MVP-003

# Update planning notes
npx cc-devtools kanban update-story MVP-001 --planning_notes="Consider using library X"

# Update acceptance criteria (comma-separated)
npx cc-devtools kanban update-story MVP-001 --acceptance_criteria="Test login,Test logout,Test errors"

# Update documentation links (comma-separated)
npx cc-devtools kanban update-story MVP-001 --relevant_documentation="./docs/api.md,https://example.com/spec"

# Update implementation notes
npx cc-devtools kanban update-story MVP-001 --implementation_notes="Used JWT library for tokens"

# Update multiple fields at once
npx cc-devtools kanban update-story MVP-001 --title="New title" --effort=8 --labels=urgent --details="More info"
```

**Available Fields:**
- `--title` - Story title
- `--description` - Story description
- `--details` - Extended technical details
- `--phase` - Workflow phase (MVP, BETA, V1, POSTRELEASE, or custom)
- `--business_value` - Business value (XS, S, M, L, XL)
- `--effort` - Effort estimation in hours
- `--labels` - Labels (comma-separated)
- `--dependent_upon` - Story dependencies (comma-separated IDs)
- `--planning_notes` - Planning notes
- `--acceptance_criteria` - Acceptance criteria (comma-separated)
- `--relevant_documentation` - Documentation links (comma-separated)
- `--implementation_notes` - Implementation notes

**Output:**
```json
{
  "success": true,
  "command": "update-story",
  "data": {
    "id": "MVP-001",
    "updatedFields": ["title", "effort_estimation_hours"],
    "updates": {
      "title": "New story title",
      "effort_estimation_hours": 8
    },
    "timestamp": "2025-10-10T15:00:00Z",
    "story": { ... }
  }
}
```

### update-subtask

Update subtask fields (excluding status, which should use `move`).

```bash
# Update subtask title
npx cc-devtools kanban update-subtask MVP-001-1 --title="New subtask title"

# Update description
npx cc-devtools kanban update-subtask MVP-001-1 --description="Updated subtask description"

# Update extended details
npx cc-devtools kanban update-subtask MVP-001-1 --details="Extended technical details"

# Update effort estimation
npx cc-devtools kanban update-subtask MVP-001-1 --effort=4

# Update dependencies (comma-separated subtask IDs)
npx cc-devtools kanban update-subtask MVP-001-3 --dependent_upon=MVP-001-1,MVP-001-2

# Update planning notes
npx cc-devtools kanban update-subtask MVP-001-1 --planning_notes="Use pattern X for implementation"

# Update acceptance criteria (comma-separated)
npx cc-devtools kanban update-subtask MVP-001-1 --acceptance_criteria="Test A,Test B,Test C"

# Update documentation links (comma-separated)
npx cc-devtools kanban update-subtask MVP-001-1 --relevant_documentation="./docs/guide.md,https://api.example.com"

# Update implementation notes
npx cc-devtools kanban update-subtask MVP-001-1 --implementation_notes="Implemented using React hooks"

# Update multiple fields at once
npx cc-devtools kanban update-subtask MVP-001-1 --title="New title" --effort=6 --description="New desc"
```

**Available Fields:**
- `--title` - Subtask title
- `--description` - Subtask description
- `--details` - Extended technical details
- `--effort` - Effort estimation in hours
- `--dependent_upon` - Subtask dependencies (comma-separated IDs)
- `--planning_notes` - Planning notes
- `--acceptance_criteria` - Acceptance criteria (comma-separated)
- `--relevant_documentation` - Documentation links (comma-separated)
- `--implementation_notes` - Implementation notes

**Output:**
```json
{
  "success": true,
  "command": "update-subtask",
  "data": {
    "id": "MVP-001-1",
    "storyId": "MVP-001",
    "updatedFields": ["title", "effort_estimation_hours"],
    "updates": {
      "title": "New subtask title",
      "effort_estimation_hours": 6
    },
    "timestamp": "2025-10-10T15:00:00Z",
    "subtask": { ... }
  }
}
```

### append-story-field

Append content to story fields to avoid sending large field replacements. This is particularly useful when updating large fields like `planning_notes` or `implementation_notes` incrementally, as it reduces the size of command responses.

```bash
# Append to planning notes
npx cc-devtools kanban append-story-field MVP-001 planning_notes "Additional planning considerations"

# Append to implementation notes
npx cc-devtools kanban append-story-field MVP-001 implementation_notes "Encountered edge case with X, resolved by Y"
```

**Supported Fields:**
- `planning_notes` - Pre-development thoughts and approach ideas
- `implementation_notes` - Technical notes made during development

**Behavior:**
- Content is appended with a double newline separator (`\n\n`) if the field already has content
- If the field is empty, content is added without a separator
- Updates the story's `updated_at` timestamp

**Output:**
```json
{
  "success": true,
  "command": "append-story-field",
  "data": {
    "id": "MVP-001",
    "field": "implementation_notes",
    "appendedContent": "New content here",
    "previousLength": 150,
    "newLength": 175,
    "timestamp": "2025-10-12T...",
    "story": { ... }
  }
}
```

### append-subtask-field

Append content to subtask fields to avoid sending large field replacements. Similar to `append-story-field` but for subtasks.

```bash
# Append to planning notes
npx cc-devtools kanban append-subtask-field MVP-001-1 planning_notes "Additional implementation approach"

# Append to implementation notes
npx cc-devtools kanban append-subtask-field MVP-001-1 implementation_notes "Fixed issue with async handling"
```

**Supported Fields:**
- `planning_notes` - Pre-development thoughts and approach ideas
- `implementation_notes` - Technical notes made during development

**Behavior:**
- Content is appended with a double newline separator (`\n\n`) if the field already has content
- If the field is empty, content is added without a separator
- Updates both the subtask's and parent story's `updated_at` timestamp

**Output:**
```json
{
  "success": true,
  "command": "append-subtask-field",
  "data": {
    "id": "MVP-001-1",
    "storyId": "MVP-001",
    "field": "implementation_notes",
    "appendedContent": "New content here",
    "previousLength": 80,
    "newLength": 100,
    "timestamp": "2025-10-12T...",
    "subtask": { ... }
  }
}
```

### next

Find the next recommended work item.

```bash
# Get next work recommendation
npx cc-devtools kanban next

# Pretty output
npx cc-devtools kanban next --pretty
```

**Output:**
```json
{
  "success": true,
  "command": "next",
  "data": {
    "hasCurrentWork": true,
    "current": {
      "type": "subtask",
      "story": { "id": "MVP-001", ... },
      "subtask": { "id": "MVP-001-2", ... },
      "progress": { ... }
    },
    "suggestion": "Continue working on MVP-001-2",
    "reason": "Currently in progress"
  }
}
```

### validate

Validate a status move without executing it (dry-run).

```bash
# Validate story move
npx cc-devtools kanban validate MVP-001 done

# Validate subtask move
npx cc-devtools kanban validate MVP-001-1 in_progress

# Pretty output
npx cc-devtools kanban validate MVP-001 done --pretty
```

**Output:**
```json
{
  "success": true,
  "command": "validate",
  "data": {
    "valid": false,
    "id": "MVP-001",
    "type": "story",
    "currentStatus": "in_progress",
    "newStatus": "done",
    "error": "Cannot move to done: 3 subtasks incomplete",
    "incompleteSubtasks": [...],
    "checks": [
      { "rule": "subtasks_complete", "passed": false, "reason": "3 subtasks incomplete" }
    ]
  }
}
```

### stats

Get comprehensive kanban statistics and optional health checks.

```bash
# Get statistics
npx cc-devtools kanban stats

# Include health check
npx cc-devtools kanban stats --health-check

# Pretty output
npx cc-devtools kanban stats --health-check --pretty
```

**Output:**
```json
{
  "success": true,
  "command": "stats",
  "data": {
    "stats": {
      "distribution": {
        "total": 10,
        "byStatus": { "todo": 5, "in_progress": 2, "done": 3 },
        "byPhase": { "MVP": 7, "BETA": 3 },
        "byValue": { "L": 4, "M": 6 }
      },
      "progress": {
        "completionRate": 0.3,
        "velocity": 2,
        "avgSubtasks": 4.5
      },
      "effort": {
        "total": 120,
        "byStatus": { "todo": 60, "in_progress": 40, "done": 20 },
        "byPhase": { "MVP": 80, "BETA": 40 }
      },
      "subtasks": {
        "total": 45,
        "completed": 15,
        "completionRate": 0.33
      },
      "dependencies": {
        "withDependencies": 3,
        "blockingOthers": 2,
        "readyToStart": 8
      }
    },
    "health": {
      "healthy": false,
      "issues": [
        {
          "severity": "CRITICAL",
          "type": "COMPLETED_SUBTASKS_NOT_IN_REVIEW",
          "story": { "id": "MVP-001", "title": "..." },
          "message": "All 5 subtasks completed but story not in review",
          "solution": "Run /kanban-move MVP-001 in_review"
        }
      ],
      "summary": {
        "critical": 1,
        "warning": 0
      }
    }
  }
}
```

### create-stories

Create one or more stories from JSON input (bulk creation).

```bash
# Create single story
npx cc-devtools kanban create-stories '{
  "stories": [{
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication",
    "phase": "MVP",
    "business_value": "L",
    "effort_estimation_hours": 8,
    "labels": ["backend", "security"]
  }]
}'

# Create multiple stories
npx cc-devtools kanban create-stories '{
  "stories": [
    { "title": "Story 1", "phase": "MVP", "business_value": "M" },
    { "title": "Story 2", "phase": "MVP", "business_value": "L" },
    { "title": "Story 3", "phase": "BETA", "business_value": "S" }
  ]
}'
```

**Output:**
```json
{
  "success": true,
  "command": "create-stories",
  "data": {
    "created": [
      { "id": "MVP-001", "title": "Implement user authentication" },
      { "id": "MVP-002", "title": "..." }
    ],
    "summary": {
      "count": 2,
      "byPhase": { "MVP": 2 },
      "byValue": { "L": 1, "M": 1 },
      "totalEffort": 16
    }
  }
}
```

### create-subtasks

Create one or more subtasks for a story from JSON input.

```bash
# Create subtasks
npx cc-devtools kanban create-subtasks MVP-001 '{
  "subtasks": [
    {
      "title": "Design login form",
      "effort_estimation_hours": 2
    },
    {
      "title": "Implement JWT generation",
      "effort_estimation_hours": 3
    },
    {
      "title": "Add password hashing",
      "effort_estimation_hours": 2,
      "dependent_upon": ["MVP-001-2"]
    }
  ]
}'

# With complexity analysis
npx cc-devtools kanban create-subtasks MVP-001 '{
  "subtasks": [...],
  "complexityAnalysis": "## Complexity Analysis\n\nThis feature requires..."
}'
```

**Output:**
```json
{
  "success": true,
  "command": "create-subtasks",
  "data": {
    "storyId": "MVP-001",
    "created": [
      { "id": "MVP-001-1", "title": "Design login form" },
      { "id": "MVP-001-2", "title": "Implement JWT generation" },
      { "id": "MVP-001-3", "title": "Add password hashing" }
    ],
    "summary": {
      "count": 3,
      "totalEffort": 7,
      "avgEffort": 2.3
    }
  }
}
```

### init

Initialize or validate the kanban system.

```bash
# Initialize kanban.yaml with defaults
npx cc-devtools kanban init

# Pretty output
npx cc-devtools kanban init --pretty
```

**Output:**
```json
{
  "success": true,
  "command": "init",
  "data": {
    "valid": true,
    "issues": [],
    "fixes": ["Created default kanban.yaml"],
    "summary": {
      "errors": 0,
      "warnings": 0,
      "fixesApplied": 1
    }
  }
}
```

### delete-story

Delete a story and all its subtasks.

```bash
# Delete story
npx cc-devtools kanban delete-story MVP-001

# Pretty output
npx cc-devtools kanban delete-story MVP-001 --pretty
```

**Output:**
```json
{
  "success": true,
  "command": "delete-story",
  "data": {
    "deleted": {
      "id": "MVP-001",
      "title": "Implement authentication",
      "status": "in_progress",
      "subtaskCount": 5
    },
    "message": "Story MVP-001 and 5 subtask(s) deleted successfully"
  }
}
```

### delete-subtask

Delete a specific subtask from a story.

```bash
# Delete subtask
npx cc-devtools kanban delete-subtask MVP-001-2

# Pretty output
npx cc-devtools kanban delete-subtask MVP-001-2 --pretty
```

**Output:**
```json
{
  "success": true,
  "command": "delete-subtask",
  "data": {
    "deleted": {
      "id": "MVP-001-2",
      "title": "Implement JWT generation",
      "status": "done",
      "parentStoryId": "MVP-001"
    },
    "story": {
      "id": "MVP-001",
      "title": "Implement authentication",
      "remainingSubtasks": 4
    },
    "message": "Subtask MVP-001-2 deleted successfully"
  }
}
```

### add-review

Add review feedback for a story. Reviews are stored separately in `cc-devtools/reviews.yaml` to prevent MCP response truncation when stories accumulate multiple review rounds.

```bash
# Add a review
npx cc-devtools kanban add-review --story MVP-001 --round 2 --author codex --content "Fix the CORS configuration for production"

# Pretty output
npx cc-devtools kanban add-review --story MVP-001 --round 1 --author claude --content "Great work! Just minor changes needed" --pretty
```

**Parameters:**
- `--story` (required) - Story ID (e.g., MVP-001)
- `--round` (required) - Review round number (positive integer)
- `--author` (required) - Reviewer name (e.g., claude, codex, qwen)
- `--content` (required) - Review content (markdown supported)

**Output:**
```json
{
  "success": true,
  "command": "add-review",
  "data": {
    "success": true,
    "message": "Review added successfully",
    "storyId": "MVP-001",
    "round": 2,
    "reviewer": "codex"
  }
}
```

### get-review

Retrieve a specific review by story ID, round number, and reviewer.

```bash
# Get a specific review
npx cc-devtools kanban get-review --story MVP-001 --round 2 --author codex

# Pretty output
npx cc-devtools kanban get-review --story MVP-001 --round 1 --author claude --pretty
```

**Parameters:**
- `--story` (required) - Story ID
- `--round` (required) - Review round number
- `--author` (required) - Reviewer name

**Output (found):**
```json
{
  "success": true,
  "command": "get-review",
  "data": {
    "storyId": "MVP-001",
    "round": 2,
    "reviewer": "codex",
    "review": "# Review Feedback\n\nFix the CORS configuration for production...",
    "timestamp": "2025-10-14T15:30:00Z"
  }
}
```

**Output (not found):**
```json
{
  "success": true,
  "command": "get-review",
  "data": {
    "error": "Review not found",
    "storyId": "MVP-001",
    "round": 2,
    "reviewer": "codex"
  }
}
```

### get-round-reviewers

Get all reviewers grouped by review round for a story.

```bash
# Get reviewers by round
npx cc-devtools kanban get-round-reviewers --story MVP-001

# Pretty output
npx cc-devtools kanban get-round-reviewers --story MVP-001 --pretty
```

**Parameters:**
- `--story` (required) - Story ID

**Output:**
```json
{
  "success": true,
  "command": "get-round-reviewers",
  "data": {
    "storyId": "MVP-001",
    "rounds": [
      {
        "round": 1,
        "reviewers": ["claude", "codex"]
      },
      {
        "round": 2,
        "reviewers": ["claude", "codex", "qwen"]
      }
    ]
  }
}
```

**Output (no reviews):**
```json
{
  "success": true,
  "command": "get-round-reviewers",
  "data": {
    "storyId": "MVP-001",
    "rounds": []
  }
}
```

### search

Search for stories and subtasks using hybrid keyword + semantic search. Combines exact keyword matching with semantic similarity to find relevant work items, even when phrasing differs.

```bash
# Basic search
npx cc-devtools kanban search "authentication"

# Search with custom limit
npx cc-devtools kanban search "error handling" --limit=10

# Search with custom similarity threshold
npx cc-devtools kanban search "cache" --similarity-threshold=0.5

# Search only stories
npx cc-devtools kanban search "api endpoints" --scope=stories

# Search only subtasks
npx cc-devtools kanban search "add tests" --scope=subtasks

# Filter by status
npx cc-devtools kanban search "database" --status=todo

# Search within specific story's subtasks
npx cc-devtools kanban search "validation" --story=MVP-001

# Pretty output
npx cc-devtools kanban search "authentication" --pretty
```

**Parameters:**
- `query` (required, positional) - Search query string
- `--limit` (optional) - Maximum number of results (default: 10)
- `--similarity-threshold` (optional) - Minimum semantic similarity score 0-1 (default: 0.3)
- `--scope` (optional) - Search scope: `stories`, `subtasks`, or `both` (default: `stories`)
- `--status` (optional) - Filter by status: `todo`, `in_progress`, `in_review`, `done`, `blocked`
- `--story` (optional) - Filter subtasks by parent story ID (only works with `--scope=subtasks`)

**How It Works:**

Hybrid search combines two scoring methods:

1. **Keyword Matching** (exact/partial text matching):
   - Exact tag match: +1.0 score
   - Partial tag match: +0.7 score
   - Query appears in summary: +0.7 score
   - Query appears in details: +0.7 score
   - Scores are additive (multiple matches stack)

2. **Semantic Similarity** (conceptual matching via embeddings):
   - Embeddings generated from `${summary}\n${details}` using @xenova/transformers
   - Cosine similarity computed (0-1.0 range)
   - Only results above similarity threshold included
   - Helps find conceptually related items even with different wording

3. **Final Score**: keyword score + semantic score, sorted descending

**Embeddings:**
- Generated lazily on first search
- Cached in `cc-devtools/kanban/.embeddings.msgpack`
- Uses Xenova/all-MiniLM-L6-v2 model via @xenova/transformers
- Embeddings regenerated if story/subtask content changes

**Use Cases:**
- **Duplicate detection**: Find similar stories before creating new ones
- **Cross-referencing**: Discover related work across different stories
- **Impact analysis**: Find all stories/subtasks related to a feature area
- **Planning**: Identify dependencies and related work

**Output:**
```json
{
  "success": true,
  "command": "search",
  "data": {
    "query": "authentication",
    "results": [
      {
        "item": {
          "id": "MVP-001",
          "title": "Implement user authentication",
          "status": "in_progress",
          "type": "story",
          "summary": "Implement user authentication",
          "details": "Add JWT-based authentication with OAuth providers...",
          "phase": "MVP",
          "business_value": "L"
        },
        "score": 1.42,
        "breakdown": {
          "keywordScore": 0.7,
          "semanticScore": 0.72
        }
      },
      {
        "item": {
          "id": "MVP-003-2",
          "parentStoryId": "MVP-003",
          "title": "Add login form validation",
          "status": "todo",
          "type": "subtask",
          "summary": "Add login form validation",
          "details": "Validate user credentials before auth request..."
        },
        "score": 0.95,
        "breakdown": {
          "keywordScore": 0.0,
          "semanticScore": 0.95
        }
      }
    ],
    "count": 2,
    "limit": 10,
    "similarityThreshold": 0.3,
    "scope": "stories"
  }
}
```

**Examples:**

```bash
# Find duplicate stories before creating new one
npx cc-devtools kanban search "user login authentication" --limit=5 --similarity-threshold=0.4

# Find all work related to caching
npx cc-devtools kanban search "cache" --scope=both --limit=20

# Find todo items related to testing
npx cc-devtools kanban search "tests" --status=todo --scope=subtasks

# High-precision search (stricter matching)
npx cc-devtools kanban search "CORS configuration" --similarity-threshold=0.6
```

## Error Handling

All commands use consistent error responses:

```json
{
  "success": false,
  "command": "move",
  "error": "Story MVP-999 not found",
  "code": "NOT_FOUND"
}
```

**Error Codes:**
- `NOT_FOUND` - Story/subtask not found
- `INVALID_INPUT` - Invalid arguments or JSON
- `VALIDATION_FAILED` - Validation rules failed
- `FILE_ERROR` - File I/O error
- `LOCK_TIMEOUT` - File lock timeout
- `UNKNOWN_ERROR` - Unexpected error

## Usage with Slash Commands

The CLI commands integrate with the kanban slash command templates:

- `/kanban-list` → `npx cc-devtools kanban list`
- `/kanban-detail <id>` → `npx cc-devtools kanban get <id>`
- `/kanban-move <id> <status>` → `npx cc-devtools kanban move <id> <status>`
- `/kanban-next` → `npx cc-devtools kanban next`
- `/kanban-add-stories` → Uses `create-stories` command
- `/kanban-add-subtasks` → Uses `create-subtasks` command

See [SLASH_COMMANDS.md](./SLASH_COMMANDS.md) for slash command documentation.

## Programmatic Usage

The CLI commands can be called programmatically from Node.js:

```typescript
import { kanbanCommand } from '@shaenchen/cc-devtools/dist/cli/commands/kanban/index.js';

// Call command with args
const result = await kanbanCommand(['list', '--filter=todo']);
console.log(JSON.parse(result));
```

Or use the kanban library directly:

```typescript
import { readAllStories, filterStories } from '@shaenchen/cc-devtools/dist/kanban/lib/storage.js';
import { getNextWorkItem } from '@shaenchen/cc-devtools/dist/kanban/lib/recommendation.js';

const stories = await readAllStories();
const todoStories = filterStories(stories, { status: 'todo' });
const next = getNextWorkItem(stories);
```

## File Locking

All storage operations use automatic file locking via `lib/file-lock.ts` to prevent concurrent access issues. The CLI is safe for:

- Multiple Claude Code instances
- Concurrent slash command executions
- MCP tool usage alongside CLI commands

Lock timeout: 10 seconds (fails with `LOCK_TIMEOUT` error if exceeded)

## Testing

Test the CLI commands:

```bash
# Build
npm run build

# Test help
node dist/cli/index.js kanban --help

# Test list (empty initially)
node dist/cli/index.js kanban list --pretty

# Test create
node dist/cli/index.js kanban create-stories '{
  "stories": [{"title": "Test", "phase": "MVP"}]
}'

# Test get
node dist/cli/index.js kanban get MVP-001 --pretty

# Test stats
node dist/cli/index.js kanban stats --health-check --pretty
```
