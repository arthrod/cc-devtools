# Subtask Schema Reference

Subtasks follow the `SubtaskSchema`, which extends `BaseTaskSchema` with a parent reference.

## Required Fields

### `id` (string)
- **Purpose**: Unique identifier for the subtask
- **Format**: `{PARENT_ID}-{NUMBER}` (e.g., `MVP-001-1`, `MVP-001-2`)
- **When to use**: Always required

### `title` (string)
- **Purpose**: Short, descriptive name for the subtask
- **When to use**: Always required

### `description` (string)
- **Purpose**: Summary of what the subtask accomplishes
- **When to use**: Always required

---

## Subtask-Specific Fields

### `parent_story_id` (string, optional)
- **Purpose**: ID of the parent story this subtask belongs to
- **When to use**: Always set to maintain relationship

### `status` (string, optional)
- **Purpose**: Current position in workflow
- **Valid values**: `todo`, `in_progress`, `done`
- **Default**: `todo`
- **Rules**: Can only be worked on when parent story is `in_progress`

---

## Optional Fields

Subtasks support the same optional fields as stories:

### `details` (string, optional)
- **Purpose**: Extended description with technical details
- **When to use**: When `description` needs more context

### `effort_estimation_hours` (number, optional)
- **Purpose**: Estimated hours to complete the subtask
- **When to use**: During planning to understand scope

### `completion_timestamp` (string | null, optional)
- **Purpose**: ISO 8601 timestamp when subtask was completed
- **Format**: `"2025-10-03T15:30:00Z"`
- **When to use**: Set when moving to `done` status

### `implementation_notes` (string, optional)
- **Purpose**: Technical notes made during development
- **When to use**: Document decisions or changes during implementation
- **Tip**: Use `append-subtask-field` command to incrementally add notes without sending the entire field content

### `acceptance_criteria` (array of strings, optional)
- **Purpose**: Specific, testable conditions for subtask completion
- **Default**: `[]`
- **When to use**: Optional but recommended for complex subtasks

### `dependent_upon` (array of strings, optional)
- **Purpose**: IDs of other subtasks or stories that must be completed first
- **Default**: `[]`
- **Format**: Array of IDs (e.g., `["MVP-001-1", "MVP-002"]`)
- **When to use**: When this subtask requires other work to be finished first

### `planning_notes` (string, optional)
- **Purpose**: Pre-development thoughts and approach ideas
- **Default**: `""`
- **When to use**: During subtask creation to capture initial thinking
- **Tip**: Use `append-subtask-field` command to incrementally add notes without sending the entire field content

### `created_at` (string, optional)
- **Purpose**: ISO 8601 timestamp when subtask was created
- **When to use**: Set when creating the subtask

### `updated_at` (string, optional)
- **Purpose**: ISO 8601 timestamp of last modification
- **When to use**: Update whenever the subtask is modified

### `relevant_documentation` (array of strings, optional)
- **Purpose**: Links to documentation, specs, or resources related to this subtask
- **Default**: `[]`
- **Format**: Array of file paths or URLs
- **Examples**: `["./docs/api-spec.md", "https://docs.example.com/auth"]`
- **When to use**: Reference documentation that provides context, specifications, or implementation guidance for the subtask

---

## Fields NOT Available on Subtasks

Subtasks do **NOT** have these story-specific fields:
- `business_value`
- `phase`
- `subtasks` (subtasks cannot be nested)
- `labels`

---

## Workflow Rules

1. **Parent must be `in_progress`**: Cannot work on subtasks unless parent story is active
2. **All must complete before review**: Every subtask must be `done` before parent can move to `in_review`
3. **Simplified statuses**: Subtasks use only: `todo`, `in_progress`, `done`
