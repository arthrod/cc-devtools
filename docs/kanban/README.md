# Kanban Tool Documentation

File-based kanban system for managing project work with stories, subtasks, and workflow phases.

## Overview

The Kanban tool provides project management capabilities through a YAML-based storage system with intelligent work recommendations and workflow enforcement.

### Key Features

- **Configurable Workflow Phases:** Customize phases to match your process (defaults: MVP, BETA, V1, POSTRELEASE)
- **Story Management:** Create and track stories with priorities and dependencies
- **Subtask Management:** Break down stories into actionable subtasks
- **Dependency Tracking:** Manage blockers and dependencies across stories and subtasks
- **Intelligent Recommendations:** Get AI-powered work item suggestions
- **Status Validation:** Enforce workflow rules and prevent invalid transitions
- **Progress Analytics:** Track progress across phases and stories

## Storage

- **File:** `cc-devtools/kanban.yaml`
- **Format:** YAML with configuration and stories
- **Created:** Automatically on first use
- **Version Control:** Should be committed to git
- **Cache:** `cc-devtools/.cache/kanban-embeddings.msgpack` (gitignored, auto-regenerated, used for search feature)

## CLI Commands

The Kanban tool includes a comprehensive CLI with 15 commands for managing stories and subtasks directly from the terminal or through slash commands.

**Commands:**
- `list` - List and filter stories
- `get` - Get story/subtask details
- `move` - Move story/subtask to new status
- `update-story` - Update story fields (title, description, phase, business value, effort, etc.)
- `update-subtask` - Update subtask fields (title, effort, dependencies, notes)
- `append-story-field` - Append content to story fields (planning_notes, implementation_notes)
- `add-review` - Add review feedback for a story
- `get-review` - Retrieve a specific review
- `get-round-reviewers` - Get reviewers grouped by round
- `append-subtask-field` - Append content to subtask fields (planning_notes, implementation_notes)
- `next` - Find next work item
- `validate` - Validate status moves (dry-run)
- `stats` - Get statistics and health checks
- `create-stories` - Bulk create stories from JSON
- `create-subtasks` - Bulk create subtasks from JSON
- `init` - Initialize kanban system
- `delete-story` - Delete story and subtasks
- `delete-subtask` - Delete specific subtask

**Quick Examples:**
```bash
# List all stories
npx cc-devtools kanban list --pretty

# Get story details
npx cc-devtools kanban get MVP-001

# Move story to in-progress
npx cc-devtools kanban move MVP-001 in_progress

# Update story fields
npx cc-devtools kanban update-story MVP-001 --title="New title" --effort=8

# Update subtask fields
npx cc-devtools kanban update-subtask MVP-001-1 --effort=4

# Append to story field (useful for large fields)
npx cc-devtools kanban append-story-field MVP-001 implementation_notes "Fixed bug in error handling"

# Append to subtask field
npx cc-devtools kanban append-subtask-field MVP-001-1 planning_notes "Consider edge case X"

# Get next work recommendation
npx cc-devtools kanban next

# Get statistics with health check
npx cc-devtools kanban stats --health-check
```

[📖 Full CLI Documentation](./CLI.md)

## MCP Tools

### `kanban_get_work_item`

Get recommended work items based on current state, priorities, and dependencies. Returns condensed format by default to prevent output truncation.

**Parameters:**
- `include_details` (optional, boolean, default: false) - Include verbose fields (details, planning_notes, implementation_notes, relevant_documentation)

**Returns (condensed - default):**
```json
{
  "current_work": {
    "story": {
      "id": "MVP-001",
      "title": "Implement user authentication",
      "status": "in_progress",
      "business_value": "L",
      "phase": "MVP",
      "subtasks_count": 5,
      "effort_estimation_hours": 16,
      "labels": ["backend"],
      "dependent_upon": [],
      "acceptance_criteria": ["User can login", "Passwords are hashed"]
    },
    "next_subtask": {
      "id": "MVP-001-3",
      "title": "Add password hashing",
      "description": "Implement bcrypt hashing",
      "status": "todo",
      "effort_estimation_hours": 2,
      "dependent_upon": ["MVP-001-2"],
      "acceptance_criteria": ["Passwords are hashed", "Verify works"]
    }
  },
  "recommendation": "Work on next subtask: MVP-001-3 - Add password hashing",
  "alternatives": [...],
  "next_steps": [
    "Start MVP-001-3",
    "Update status to in_progress"
  ],
  "warning": "Condensed output: Some fields are hidden. Set includeDetails=true to see all fields including: description, details, planning_notes, implementation_notes, relevant_documentation, completion_timestamp, updated_at"
}
```

**Note:** The condensed format omits verbose fields like `details`, `planning_notes`, `implementation_notes`, and `relevant_documentation` to prevent truncation. A `warning` field is included in condensed output that lists the hidden fields and instructions for accessing them. Pass `include_details: true` to get the full output without the warning.

### `kanban_update_work_item`

Update the status of a story or subtask with validation.

**Parameters:**
- `id` (required, string) - Story ID (e.g., "STORY-001" or "STORY-001-1" for subtask)
- `status` (required, string) - New status (todo, in_progress, done, blocked)
- `metadata` (optional, object) - Additional fields to update

**Returns:**
```json
{
  "success": true,
  "workItem": {
    "id": "STORY-001",
    "status": "done",
    "updated_at": "2025-10-07T12:00:00Z"
  },
  "message": "Updated STORY-001 to done"
}
```

**Validation:**
- Ensures valid status transitions
- Checks for blocking dependencies
- Validates subtask requirements
- Enforces workflow rules

## Data Schema

### Story Schema

See [story-schema.md](./story-schema.md) for complete field reference.

**Key Fields:**
- `id` - Story identifier (e.g., "MVP-001", "BETA-001", "V1-001", "POSTRELEASE-001")
- `title` - Short descriptive title
- `description` - Detailed description and context
- `status` - Current status (todo, in_progress, done, blocked)
- `phase` - Workflow phase (one of your configured phases: MVP, BETA, V1, POSTRELEASE, etc.)
- `priority` - Priority level (low, medium, high)
- `dependencies` - List of blocking story IDs
- `subtasks` - List of subtask objects
- `tags` - Categorization tags
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Subtask Schema

See [subtask-schema.md](./subtask-schema.md) for complete field reference.

**Key Fields:**
- `id` - Subtask identifier (e.g., "MVP-001-1", "BETA-001-2")
- `title` - Short descriptive title
- `description` - Detailed description
- `status` - Current status (todo, in_progress, done)
- `dependencies` - List of blocking subtask IDs
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

## Workflow Phases

Phases are fully customizable via the `kanban.yaml` configuration. The system defaults to four phases but you can define any phases that match your workflow.

### Default Phases

**MVP** - Core functionality needed for basic product viability
- Essential features only, must-have for initial launch

**BETA** - Enhanced features for early adopters
- Improved UX and additional capabilities

**V1** - Production release features
- Final features for version 1.0 launch

**POSTRELEASE** - Post-launch improvements and refinements
- Performance, edge cases, polish, and future enhancements

### Custom Phases

You can define your own phases to match your workflow. Common examples:

**Traditional Software Release:**
```yaml
phases:
  - ALPHA
  - BETA
  - RC
  - PRODUCTION
```

**Agile Sprints:**
```yaml
phases:
  - SPRINT_1
  - SPRINT_2
  - SPRINT_3
```

**Priority-Based:**
```yaml
phases:
  - CRITICAL
  - HIGH
  - MEDIUM
  - LOW
```

See the [Configuration](#customizing-phases) section below for how to customize phases.

## Status Workflow

### Story Statuses
- **todo** - Not yet started
- **in_progress** - Currently being worked on
- **blocked** - Cannot proceed due to dependencies
- **done** - Completed and verified

### Subtask Statuses
- **todo** - Not yet started
- **in_progress** - Currently being worked on
- **done** - Completed

## Work Recommendation Algorithm

The `kanban_get_work_item` tool uses intelligent logic to recommend work:

1. **Check Current Work** - Returns in-progress items first
2. **Analyze Dependencies** - Filters out blocked items
3. **Sort by Priority** - High priority items ranked higher
4. **Consider Phase** - MVP items ranked higher than BETA/V1
5. **Include Subtasks** - Breaks down stories into actionable subtasks
6. **Provide Reasoning** - Explains why each item is recommended

## Validation Rules

### Story Validation
- Story IDs must match configured phase prefix (e.g., MVP-\*, BETA-\*, POSTRELEASE-\*)
- Phase must be one of the configured phases
- Dependencies must reference existing stories
- Cannot mark done if subtasks are incomplete
- Cannot mark done if dependencies are incomplete

### Subtask Validation
- Subtask IDs must match parent story (STORY-001-1, STORY-001-2, etc.)
- Dependencies must reference subtasks in the same story
- Cannot mark parent story done while subtasks are incomplete

## Configuration

The kanban.yaml file includes a configuration section that controls workflow behavior.

### Default Configuration

```yaml
config:
  statuses:
    story: [todo, in_progress, in_review, done]
    subtask: [todo, in_progress, done]
  business_values: [XS, S, M, L, XL]
  phases:
    - MVP
    - BETA
    - V1
    - POSTRELEASE
  default_status:
    story: todo
    subtask: todo
  workflow_rules:
    max_stories_in_progress: 1
    subtasks_require_story_in_progress: true
    all_subtasks_completed_before_review: true

stories:
  - id: MVP-001
    title: "Example story"
    phase: MVP
    ...
```

### Customizing Phases

To customize phases, edit the `phases` array in your `cc-devtools/kanban.yaml`:

```yaml
config:
  phases:
    - ALPHA      # Your custom phases
    - BETA
    - RC
    - PRODUCTION
  # ... other config ...

stories:
  - id: ALPHA-001    # Story IDs use phase prefix
    title: "First alpha feature"
    phase: ALPHA
    ...
  - id: BETA-001
    title: "First beta feature"
    phase: BETA
    ...
```

**Important Notes:**
- Story IDs are prefixed with the phase name (e.g., `MVP-001`, `BETA-015`)
- The system auto-generates story IDs based on configured phases
- You can use any phase names that make sense for your workflow
- Phase names should be uppercase and URL-safe (letters, numbers, underscores, hyphens)

### Phase Migration

If you change phases after creating stories, existing stories retain their original phase. You can:
1. Manually update story phases in the YAML
2. Create new stories with the new phase structure
3. Keep both old and new phases during transition

## Best Practices

### Story Creation
- Use clear, action-oriented titles
- Include detailed descriptions with acceptance criteria
- Set realistic priorities (avoid marking everything high)
- Break large stories into subtasks
- Define dependencies early

### Workflow Management
- Work on one story at a time (avoid too many in_progress items)
- Update status frequently to keep recommendations accurate
- Review blocked items regularly to resolve dependencies
- Complete earlier phases before moving to later phases (e.g., MVP before BETA)

### Dependency Management
- Use dependencies to enforce work order
- Keep dependency chains short (avoid deep nesting)
- Document why dependencies exist in descriptions
- Review and remove dependencies when they're no longer relevant

## Troubleshooting

### Work Recommendations Not Showing Expected Items

**Check:**
1. Item status - Only `todo` items are recommended (unless already in_progress)
2. Dependencies - Blocked items won't be recommended
3. Priority - Lower priority items ranked below higher priority
4. Phase - Earlier phases ranked above later phases (based on config order)

### Cannot Update Story Status

**Common Issues:**
1. **Blocked by dependencies** - Complete blocking stories first
2. **Incomplete subtasks** - Cannot mark story done with incomplete subtasks
3. **Invalid status transition** - Check allowed status transitions
4. **File locked** - Another process is modifying kanban.yaml

### Data File Corruption

If `kanban.yaml` becomes corrupted:
1. Check YAML syntax with a validator
2. Restore from git history
3. Review validation errors in Claude Code logs
4. Start with minimal valid structure and rebuild

## Examples

### Creating a Story

```yaml
stories:
  - id: MVP-001
    title: "Implement user authentication"
    description: |
      Add basic user authentication with email/password.

      Acceptance Criteria:
      - User can register with email/password
      - User can login with credentials
      - Passwords are hashed securely
    status: todo
    phase: MVP
    priority: high
    dependencies: []
    subtasks: []
    tags: [authentication, security]
    created_at: "2025-10-07T10:00:00Z"
    updated_at: "2025-10-07T10:00:00Z"
```

### Creating Subtasks

```yaml
stories:
  - id: MVP-001
    title: "Implement user authentication"
    # ... other fields ...
    subtasks:
      - id: MVP-001-1
        title: "Create user database schema"
        description: "Design and implement user table with email, password hash"
        status: todo
        dependencies: []
        created_at: "2025-10-07T10:00:00Z"
        updated_at: "2025-10-07T10:00:00Z"

      - id: MVP-001-2
        title: "Implement registration endpoint"
        description: "POST /api/register with validation and password hashing"
        status: todo
        dependencies: [MVP-001-1]
        created_at: "2025-10-07T10:00:00Z"
        updated_at: "2025-10-07T10:00:00Z"
```

### Setting Dependencies

```yaml
stories:
  - id: MVP-002
    title: "Implement password reset"
    description: "Allow users to reset forgotten passwords via email"
    status: todo
    phase: MVP
    priority: medium
    dependencies: [MVP-001]  # Must complete authentication first
    # ... other fields ...
```

## Integration with Claude Code

The Kanban tool is designed to work seamlessly with Claude Code:

1. **Automatic Recommendations** - Claude can ask for next work item
2. **Status Updates** - Claude can update status after completing work
3. **Context Awareness** - Claude can see full story/subtask details
4. **Validation** - Claude receives feedback on invalid operations
5. **Progress Tracking** - Claude can see overall project progress

## Slash Commands

The Kanban tool includes 10 slash command templates for convenient access to common operations:

- `/kanban-next` - Get next recommended work item
- `/kanban-board` - View full kanban board
- `/kanban-list` - List stories with filters
- `/kanban-detail` - Get story details
- `/kanban-move` - Move stories between statuses
- `/kanban-start-work` - Start working on a story
- `/kanban-update-progress` - Update work progress
- `/kanban-add-stories` - Add new stories
- `/kanban-add-subtasks` - Break stories into subtasks
- `/kanban-groom` - Groom the kanban board

See [SLASH_COMMANDS.md](./SLASH_COMMANDS.md) for detailed descriptions and usage.

## Related Documentation

- [Slash Commands](./SLASH_COMMANDS.md) - Detailed slash command guide
- [Story Schema](./story-schema.md) - Complete story field reference
- [Subtask Schema](./subtask-schema.md) - Complete subtask field reference
- [Main README](../../README.md) - Package documentation
- [CHANGELOG](../../CHANGELOG.md) - Version history

## Support

- **Issues:** [GitHub Issues](https://github.com/shaenchen/cc-devtools/issues)
- **Main Documentation:** [cc-devtools README](../../README.md)
