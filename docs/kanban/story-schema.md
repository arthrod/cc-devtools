# Story Schema Reference

Stories follow the `StorySchema` from `../cc-devtools/src/types/domains/kanban/board.ts`.

## Required Fields

### `id` (string)
- **Purpose**: Unique identifier for the story
- **Format**: `{PHASE}-{NUMBER}` (e.g., `MVP-001`, `BETA-015`)
- **When to use**: Always required, auto-generated based on phase and existing stories

### `title` (string)
- **Purpose**: Short, descriptive name for the story
- **Format**: Imperative statement (e.g., "Implement user authentication")
- **When to use**: Always required

### `description` (string)
- **Purpose**: Summary of what the story accomplishes
- **Format**: 1-3 sentences describing the feature or fix
- **When to use**: Always required

---

## Status & Tracking Fields

### `status` (string, optional)
- **Purpose**: Current position in workflow
- **Valid values**: `todo`, `in_progress`, `in_review`, `done`
- **Default**: `todo`
- **When to use**: Always set; only one story should be `in_progress` at a time

### `completion_timestamp` (string | null, optional)
- **Purpose**: ISO 8601 timestamp when story was completed
- **Format**: `"2025-10-03T15:30:00Z"`
- **When to use**: Set when moving to `done` status

### `created_at` (string, optional)
- **Purpose**: ISO 8601 timestamp when story was created
- **When to use**: Set when creating the story file

### `updated_at` (string, optional)
- **Purpose**: ISO 8601 timestamp of last modification
- **When to use**: Update whenever the story is modified

---

## Planning Fields

### `details` (string, optional)
- **Purpose**: Extended description with technical details, context, or requirements
- **When to use**: When `description` isn't sufficient; add technical specs, user scenarios, or additional context

### `business_value` (BusinessValue, optional)
- **Purpose**: T-shirt sizing for relative value estimation
- **Valid values**: `XS`, `S`, `M`, `L`, `XL`
- **Numeric mapping**: XS=1, S=2, M=3, L=5, XL=8 (Fibonacci-inspired)
- **When to use**: For prioritization; helps decide what to work on next

### `phase` (string, optional)
- **Purpose**: Project phase or milestone (derived from ID prefix)
- **Examples**: `MVP`, `BETA`, `V1`, `POSTRELEASE` (defaults), or your custom phases
- **When to use**: Automatically set based on story ID prefix
- **Customization**: Phases are configurable in kanban.yaml config

### `effort_estimation_hours` (number, optional)
- **Purpose**: Estimated hours to complete the story
- **When to use**: During planning to understand scope and schedule work

### `planning_notes` (string, optional)
- **Purpose**: Pre-development thoughts, approach ideas, trade-offs considered
- **Default**: `""`
- **When to use**: During story creation to capture initial thinking
- **Tip**: Use `append-story-field` command to incrementally add notes without sending the entire field content

---

## Execution Fields

### `implementation_notes` (string, optional)
- **Purpose**: Technical notes made during development
- **When to use**: Document decisions, gotchas, or changes made during implementation
- **Tip**: Use `append-story-field` command to incrementally add notes without sending the entire field content

### `acceptance_criteria` (array of strings, optional)
- **Purpose**: Specific, testable conditions that must be met for story completion
- **Default**: `[]`
- **Format**: Each item is a clear, verifiable statement
- **Example**:
  ```json
  [
    "User can register with email and password",
    "Invalid email shows validation error",
    "Password must be at least 8 characters"
  ]
  ```
- **When to use**: Define during planning; verify before moving to `review`

---

## Relationship Fields

### `dependent_upon` (array of strings, optional)
- **Purpose**: IDs of other stories that must be completed first
- **Default**: `[]`
- **Format**: Array of story IDs (e.g., `["MVP-001", "MVP-003"]`)
- **When to use**: When this story requires work from other stories to be finished first

### `subtasks` (array of Subtask, optional)
- **Purpose**: Breakdown of work items within the story
- **When to use**: When a story needs decomposition into smaller, manageable tasks
- **Rules**:
  - All subtasks must be `done` before story can move to `in_review`
  - Subtasks can only be worked on when story is `in_progress`

### `labels` (array of strings, optional)
- **Purpose**: Tags for categorization and filtering
- **Default**: `[]`
- **Examples**: `["backend", "frontend", "security", "bug", "refactor"]`
- **When to use**: For organizing and filtering stories by theme or area

### `relevant_documentation` (array of strings, optional)
- **Purpose**: Links to documentation, specs, or resources related to this story
- **Default**: `[]`
- **Format**: Array of file paths or URLs
- **Examples**: `["./docs/api-spec.md", "https://docs.example.com/auth", "./kanban/docs/workflow-guide.md"]`
- **When to use**: Reference documentation that provides context, specifications, or implementation guidance for the story

---

## Story Sizing Guidelines

- **Small stories (XS-S)**: 1-4 hours, minimal or no subtasks
- **Medium stories (M)**: 4-8 hours, 2-5 subtasks
- **Large stories (L-XL)**: 8-16+ hours, 5-10 subtasks

If a story is larger than XL, consider breaking it into multiple stories.

---

## Review Feedback Storage

**Review feedback is no longer stored in the story object.** Instead, it's stored separately in `cc-devtools/reviews.yaml` to prevent MCP response truncation when stories accumulate multiple review rounds.

### Review Storage Schema

Reviews are stored with the following structure:

```typescript
{
  storyId: string;      // Story ID (e.g., "MVP-001")
  round: number;        // Review round number (1, 2, 3, etc.)
  reviewer: string;     // Reviewer name (e.g., "claude", "codex", "qwen")
  review: string;       // Review content (markdown)
  timestamp: string;    // ISO 8601 timestamp
}
```

### Managing Reviews

Use the dedicated CLI commands to work with reviews:

```bash
# Add a review
npx cc-devtools kanban add-review --story MVP-001 --round 2 --author codex --content "Fix the CORS config"

# Get a specific review
npx cc-devtools kanban get-review --story MVP-001 --round 2 --author codex

# Get all reviewers by round
npx cc-devtools kanban get-round-reviewers --story MVP-001
```
