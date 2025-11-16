# Workflow Check

Run the workflow state machine to determine the current workflow state and get guidance on what to do next.

## Instructions

1. **Run the workflow check command**

   ```bash
   npx cc-devtools workflow check
   ```

   The workflow engine will automatically:
   - Read current git state (branch, clean status, last commit)
   - Read kanban state (stories, subtasks, statuses)
   - Walk the decision tree to determine current state
   - Return actionable guidance

2. **Interpret the result**

   The workflow check returns JSON with:
   - `state`: Current workflow state name
   - `gitState`: Current git branch and status
   - `kanbanState`: Current story/subtask being worked on
   - `actionNecessary`: What action you should take next (if any)
   - `options`: Available options to choose from (if any)
   - `error`: Error message (if workflow is in invalid state)
   - `warning`: Warning message (if applicable)

3. **Follow the guidance**

   Based on the result:
   - If `actionNecessary` is present, perform that action
   - If `options` are present, choose an option and perform the corresponding action
   - If `error` is present, resolve the error condition
   - If `warning` is present, consider the warning before proceeding

## Examples

**Example 1: Story in progress with subtask**
```json
{
  "state": "SUBTASK_IN_PROGRESS_UNCOMMITTED",
  "gitState": {
    "current_branch": "feature/MVP-001-setup-database",
    "clean": false,
    "last_commit_is_finalized": false
  },
  "kanbanState": {
    "current_item": {
      "id": "MVP-001-1",
      "title": "Create database schema",
      "status": "in_progress",
      "type": "subtask"
    }
  },
  "actionNecessary": "Continue implementation of subtask MVP-001-1. When complete, mark subtask as done"
}
```

**Example 2: Story done, ready to merge**
```json
{
  "state": "STORY_DONE_BRANCH_NOT_MERGED",
  "gitState": {
    "current_branch": "main",
    "clean": true,
    "last_commit_is_finalized": true
  },
  "kanbanState": {
    "current_item": {
      "id": "MVP-001",
      "title": "Setup database",
      "status": "done",
      "type": "story"
    }
  },
  "actionNecessary": "Merge feature branch feature/MVP-001-setup-database to main with --no-ff (git merge --no-ff feature/MVP-001-setup-database)"
}
```

**Example 3: Choose next story to start**
```json
{
  "state": "STORY_TODO_OR_BLOCKED_AVAILABLE",
  "gitState": {
    "current_branch": "main",
    "clean": true,
    "last_commit_is_finalized": true
  },
  "options": [
    {
      "option": "A",
      "description": "Start story MVP-002: Setup authentication",
      "actionNecessary": "Create feature branch for story MVP-002"
    },
    {
      "option": "B",
      "description": "Start story MVP-003: Setup API routes",
      "actionNecessary": "Create feature branch for story MVP-003"
    },
    {
      "option": "C",
      "description": "Stop for now",
      "actionNecessary": "Tell user to say 'Continue working' to resume"
    }
  ]
}
```

## Notes

- The workflow check is **read-only** - it never modifies git or kanban state
- It's safe to run workflow check at any time
- The workflow engine enforces a linear, solo-developer workflow
- Only one story can be in_progress or in_review at a time
- Feature branches are required for all in_progress work
- All work happens on feature branches; main only has todo and done stories
