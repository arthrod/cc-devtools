# Decision Tree Customization

The workflow decision tree is the core logic that maps (git state + kanban state) to recommended actions. This document explains how the decision tree works and how to customize it for your workflow.

## Table of Contents

- [Overview](#overview)
- [Decision Tree Structure](#decision-tree-structure)
- [State Variables Reference](#state-variables-reference)
- [Condition Syntax](#condition-syntax)
- [Terminal States](#terminal-states)
- [Variable Substitution](#variable-substitution)
- [Customization Guide](#customization-guide)
- [Examples](#examples)
- [Best Practices](#best-practices)

---

## Overview

### What is the Decision Tree?

The decision tree is a YAML file that defines a series of **decision nodes**. Each node:

1. Evaluates a **condition** against current state
2. Follows the **if_true** or **if_false** branch
3. Eventually reaches a **terminal state** with recommended actions

### Default Decision Tree

The workflow feature ships with a comprehensive default decision tree (`templates/workflow/decision-tree.yaml`) that handles:

- Starting new work
- Managing feature branches
- Handling commits and changes
- Coordinating reviews
- Merging completed work
- Error states

You can use this as-is or customize it for your workflow.

---

## Decision Tree Structure

### Basic YAML Structure

```yaml
decisions:
  - name: root
    condition: "{{git_clean}} === true"
    if_true: check_branch
    if_false:
      state: uncommitted_changes
      action_type: suggest
      action: "Commit or stash your changes before proceeding"

  - name: check_branch
    condition: "{{git_branch}} === 'main'"
    if_true: on_main_branch
    if_false: on_feature_branch
```

### Decision Node Fields

- **name** (string): Unique identifier for this node
- **condition** (string): JavaScript expression to evaluate
- **if_true** (string | TerminalState): What to do if condition is true
  - If string: name of next decision node
  - If object: terminal state (end of tree)
- **if_false** (string | TerminalState): What to do if condition is false

### Terminal State Fields

When a branch ends with a terminal state object:

```yaml
if_true:
  state: ready_to_start_work
  action_type: options
  options:
    - option: Start Story
      description: "Begin work on '{{next_story_title}}'"
      actionNecessary: "npx cc-devtools kanban update-work-item {{next_story_id}} --status in_progress"
```

- **state** (string): Name of the terminal state (for logging/debugging)
- **action_type** (string): Type of action - `action`, `suggest`, `error`, `options`, `options_dynamic`
- **action** (string, optional): Single action description
- **options** (array, optional): Multiple action options
- **warning** (string, optional): Warning message to display

### Action Types

1. **action**: Single recommended action
   ```yaml
   action_type: action
   action: "Create feature branch for this story"
   ```

2. **suggest**: Suggestion without specific action
   ```yaml
   action_type: suggest
   action: "Commit your work-in-progress changes"
   ```

3. **error**: Error state that needs resolution
   ```yaml
   action_type: error
   action: "Cannot proceed: multiple stories in progress"
   ```

4. **options**: Multiple predefined options
   ```yaml
   action_type: options
   options:
     - option: Continue Implementation
       description: "Keep working on current story"
       actionNecessary: "Continue implementing the story"
   ```

5. **options_dynamic**: Options generated from data
   ```yaml
   action_type: options_dynamic
   options:
     - option: "Resume Story: {{stories_in_progress[0].title}}"
       description: "Continue working on this story"
       actionNecessary: "Continue implementation"
   ```

---

## State Variables Reference

### Git State Variables

Access current git repository state:

| Variable | Type | Description |
|----------|------|-------------|
| `git_branch` | string | Current branch name |
| `git_clean` | boolean | True if no uncommitted changes |
| `git_last_commit_is_finalized` | boolean | True if last commit message contains "finalize" |
| `modified_files` | string[] | List of modified files |
| `untracked_files` | string[] | List of untracked files |

**Example conditions:**
```javascript
{{git_branch}} === 'main'
{{git_clean}} === true
{{git_last_commit_is_finalized}} === false
{{modified_files.length}} > 0
```

### Kanban State Variables

Access kanban stories and subtasks:

| Variable | Type | Description |
|----------|------|-------------|
| `total_stories` | number | Total number of stories |
| `stories_in_progress` | Story[] | Stories with in_progress status |
| `stories_in_review` | Story[] | Stories with in_review status |
| `stories_done` | Story[] | Stories with done status |
| `stories_todo` | Story[] | Stories with todo status |
| `current_story` | Story \| null | Current story being worked on |
| `current_story_id` | string \| null | ID of current story |
| `current_story_status` | string \| null | Status of current story |
| `current_story_subtasks` | Subtask[] \| null | Subtasks of current story |
| `subtasks_in_progress` | number | Count of in_progress subtasks |
| `subtasks_todo` | number | Count of todo subtasks |
| `subtasks_done` | number | Count of done subtasks |
| `current_subtask` | Subtask \| null | Current subtask being worked on |
| `current_subtask_id` | string \| null | ID of current subtask |
| `next_subtask` | Subtask \| null | Next todo subtask |
| `next_subtask_id` | string \| null | ID of next subtask |
| `next_subtask_title` | string \| null | Title of next subtask |
| `next_story` | Story \| null | Next todo story |
| `next_story_id` | string \| null | ID of next story |
| `next_story_title` | string \| null | Title of next story |
| `current_branch_story_id` | string \| null | Story ID extracted from branch name |
| `on_feature_branch_for_done_story` | boolean | True if on feature branch for a done story |
| `first_done_story_id` | string \| null | ID of first done story (for merging) |
| `done_story_feature_branch_exists` | boolean | True if feature branch exists for done story |
| `done_story_feature_branch_name` | string \| null | Name of feature branch for done story |
| `done_story_feature_branch_merged` | boolean | True if done story branch is merged |
| `feature_branch_exists_for_current_story` | boolean | True if feature branch exists for current story |

**Example conditions:**
```javascript
{{current_story}} !== null
{{current_story_status}} === 'in_review'
{{stories_in_progress.length}} > 1
{{subtasks_todo}} > 0
{{next_story}} !== null
```

### Accessing Object Properties

Stories and subtasks are objects with these properties:

```javascript
// Story properties
{{current_story.id}}
{{current_story.title}}
{{current_story.status}}
{{current_story.description}}

// Subtask properties
{{current_subtask.id}}
{{current_subtask.title}}
{{current_subtask.status}}
```

### Array Access

```javascript
// Check array length
{{stories_in_progress.length}} > 0

// Access first element
{{stories_in_progress[0].title}}

// Access by index
{{current_story_subtasks[2].status}}
```

---

## Condition Syntax

### JavaScript Expressions

Conditions are JavaScript expressions evaluated in a sandboxed context:

```javascript
// Equality
{{git_branch}} === 'main'

// Inequality
{{current_story_status}} !== 'done'

// Logical operators
{{git_clean}} === true && {{current_story}} !== null

// Comparison
{{stories_in_progress.length}} > 1

// Null checks
{{next_story}} !== null

// Boolean values
{{git_last_commit_is_finalized}} === false
```

### Variable Substitution

Variables are enclosed in `{{...}}`:

```javascript
{{variable_name}}
{{object.property}}
{{array[0]}}
{{array.length}}
```

### Supported Operators

- **Equality**: `===`, `!==`
- **Comparison**: `>`, `<`, `>=`, `<=`
- **Logical**: `&&`, `||`, `!`
- **Null checks**: `=== null`, `!== null`

### Important Notes

- Use `===` and `!==` (strict equality), not `==` or `!=`
- Boolean values must be explicit: `{{git_clean}} === true`, not just `{{git_clean}}`
- Null checks: `{{value}} !== null`, not `{{value}}`
- String comparisons are case-sensitive

---

## Terminal States

### Single Action

Used when there's one clear recommended action:

```yaml
if_true:
  state: need_feature_branch
  action_type: action
  action: "Create feature branch: git checkout -b feature/{{current_story_id}}"
```

### Suggestion

Used for guidance without specific commands:

```yaml
if_false:
  state: continue_implementing
  action_type: suggest
  action: "Continue implementing the current story"
```

### Error State

Used when something is wrong that needs user intervention:

```yaml
if_true:
  state: multiple_stories_in_progress
  action_type: error
  action: "Multiple stories in progress - complete or abandon one before continuing"
  warning: "Workflow expects single linear flow"
```

### Static Options

Multiple predefined options for user to choose:

```yaml
if_true:
  state: story_complete_options
  action_type: options
  options:
    - option: Move to Review
      description: "Mark story as ready for review"
      actionNecessary: "npx cc-devtools kanban update-work-item {{current_story_id}} --status in_review"
    - option: Continue Implementation
      description: "Keep working on story"
      actionNecessary: "Continue implementing"
```

### Dynamic Options

Options generated from state data:

```yaml
if_true:
  state: multiple_stories_in_progress
  action_type: options_dynamic
  options:
    - option: "Resume: {{stories_in_progress[i].title}}"
      description: "Continue working on this story"
      actionNecessary: "Work on story {{stories_in_progress[i].id}}"
```

**Note**: `[i]` is used as a placeholder that gets expanded to generate one option per array element.

---

## Variable Substitution

Variables can be substituted in:
- Action descriptions
- Option descriptions
- Option actions
- Warning messages

### Substitution Syntax

Use `{{variable}}` anywhere in strings:

```yaml
action: "Start work on story: {{next_story_title}}"
description: "Feature branch: feature/{{current_story_id}}"
actionNecessary: "npx cc-devtools kanban update-work-item {{current_story_id}} --status done"
```

### Complex Substitutions

```yaml
# Object properties
"Current story: {{current_story.title}}"

# Array access
"Next subtask: {{current_story_subtasks[0].title}}"

# Multiple variables
"Merge {{done_story_feature_branch_name}} into {{git_branch}}"
```

---

## Customization Guide

### Using Custom Decision Tree

**Option 1: Override default tree**

1. Copy default tree: `cp templates/workflow/decision-tree.yaml cc-devtools/workflow/decision-tree.yaml`
2. Edit `cc-devtools/workflow/config.yaml`:
   ```yaml
   decisionTree:
     source: file
     path: ./cc-devtools/workflow/decision-tree.yaml
   ```

**Option 2: Create from scratch**

1. Create your custom tree file
2. Edit `cc-devtools/workflow/config.yaml`:
   ```yaml
   decisionTree:
     source: file
     path: ./my-custom-workflow.yaml
   ```

### Adding New Decision Node

Add a new node to the `decisions` array:

```yaml
decisions:
  # ... existing nodes ...

  - name: check_tests_passing
    condition: "{{tests_passing}} === true"
    if_true: tests_pass
    if_false:
      state: tests_failing
      action_type: error
      action: "Tests must pass before continuing"
```

### Modifying Conditions

Change conditions to match your workflow:

```yaml
# Original: Check if on main branch
- name: check_branch
  condition: "{{git_branch}} === 'main'"

# Modified: Check if on develop branch
- name: check_branch
  condition: "{{git_branch}} === 'develop'"
```

### Adding Custom Terminal States

Create new terminal states for your workflow:

```yaml
if_true:
  state: ready_for_staging
  action_type: options
  options:
    - option: Deploy to Staging
      description: "Deploy current branch to staging environment"
      actionNecessary: "npm run deploy:staging"
    - option: Skip Staging
      description: "Deploy directly to production"
      actionNecessary: "npm run deploy:production"
```

### Changing Entry Point

The tree starts at the first decision node. Change the root node:

```yaml
decisions:
  # This is the entry point (first node)
  - name: my_custom_root
    condition: "{{git_clean}} === true"
    if_true: check_environment
    if_false: handle_dirty_state
```

---

## Examples

### Example 1: Enforce Branch Naming

Require specific branch naming convention:

```yaml
- name: check_branch_name
  condition: "{{git_branch}}.startsWith('feature/') || {{git_branch}}.startsWith('bugfix/') || {{git_branch}} === 'main'"
  if_true: branch_name_valid
  if_false:
    state: invalid_branch_name
    action_type: error
    action: "Branch name must start with 'feature/' or 'bugfix/'"
```

### Example 2: Require Tests Before Review

Add test check before allowing review:

```yaml
- name: check_tests_before_review
  condition: "{{current_story_status}} === 'in_review'"
  if_true: check_tests_passing
  if_false: continue_normal_flow

- name: check_tests_passing
  condition: "{{tests_passing}} === true"
  if_true: run_review
  if_false:
    state: tests_must_pass
    action_type: error
    action: "All tests must pass before review"
```

**Note**: You'll need to add `tests_passing` to state variables by modifying `state-reader.ts`.

### Example 3: Multi-Environment Workflow

Support dev → staging → production workflow:

```yaml
- name: check_deployment_stage
  condition: "{{current_story_status}} === 'done' && {{deployed_to_staging}} === true"
  if_true:
    state: ready_for_production
    action_type: options
    options:
      - option: Deploy to Production
        description: "Promote staging to production"
        actionNecessary: "npm run deploy:production"
      - option: Stay on Staging
        description: "Keep testing on staging"
        actionNecessary: "Continue testing"
  if_false:
    state: needs_staging_deployment
    action_type: action
    action: "Deploy to staging first: npm run deploy:staging"
```

### Example 4: Require Documentation

Check for README updates:

```yaml
- name: check_documentation
  condition: "{{modified_files}}.includes('README.md') || {{current_story.requiresDocs}} === false"
  if_true: docs_updated
  if_false:
    state: missing_documentation
    action_type: error
    action: "README.md must be updated for this story"
    warning: "Update documentation before moving to review"
```

### Example 5: Subtask-Driven Workflow

Only allow review when all subtasks are done:

```yaml
- name: check_subtasks_complete
  condition: "{{subtasks_todo}} === 0 && {{subtasks_in_progress}} === 0"
  if_true: subtasks_complete
  if_false:
    state: subtasks_incomplete
    action_type: suggest
    action: "Complete remaining subtasks before review"
    warning: "{{subtasks_todo}} todo, {{subtasks_in_progress}} in progress"
```

---

## Best Practices

### 1. Keep Conditions Simple

**Good:**
```yaml
condition: "{{git_clean}} === true"
```

**Avoid:**
```yaml
condition: "{{git_clean}} === true && {{git_branch}} !== 'main' && {{current_story}} !== null && {{current_story.status}} === 'in_progress'"
```

Break complex conditions into multiple nodes.

### 2. Use Descriptive Node Names

**Good:**
```yaml
- name: check_if_on_main_branch
- name: verify_all_subtasks_complete
- name: ensure_tests_passing
```

**Avoid:**
```yaml
- name: node1
- name: check
- name: temp
```

### 3. Provide Clear Actions

**Good:**
```yaml
action: "Create feature branch: git checkout -b feature/{{current_story_id}}"
```

**Avoid:**
```yaml
action: "Fix your branch"
```

### 4. Use Warnings for Context

```yaml
state: multiple_stories_in_progress
action_type: error
action: "Complete one story before starting another"
warning: "Found {{stories_in_progress.length}} stories in progress"
```

### 5. Test Incrementally

When customizing:
1. Make small changes
2. Run `npx cc-devtools workflow check` after each change
3. Enable debug logging: `logging.level: debug`
4. Check `workflow.log` for decision path

### 6. Document Custom Nodes

Add comments to your custom decision tree:

```yaml
decisions:
  # Entry point - check git state first
  - name: root
    condition: "{{git_clean}} === true"
    if_true: check_branch
    if_false: uncommitted_changes

  # Custom node: enforce branch naming convention
  - name: check_branch_naming
    # Branch must start with feature/ or bugfix/
    condition: "{{git_branch}}.startsWith('feature/') || {{git_branch}}.startsWith('bugfix/')"
    if_true: branch_name_valid
    if_false: invalid_branch_name
```

### 7. Handle Edge Cases

Always provide fallback paths for unexpected states:

```yaml
- name: check_story_status
  condition: "{{current_story_status}} === 'in_progress' || {{current_story_status}} === 'in_review'"
  if_true: valid_status
  if_false:
    state: unexpected_status
    action_type: error
    action: "Unexpected story status: {{current_story_status}}"
```

### 8. Version Your Decision Trees

Keep a history of your custom trees:

```bash
cc-devtools/workflow/
├── decision-tree.yaml          # Current active tree
├── decision-tree-v1.yaml       # Backup of previous version
└── decision-tree-v2.yaml       # Backup of older version
```

---

## Debugging Tips

### Enable Debug Logging

Edit `cc-devtools/workflow/config.yaml`:
```yaml
logging:
  enabled: true
  level: debug
```

This logs:
- All state variables
- Each decision node evaluated
- Condition results (true/false)
- Final terminal state

### Check Decision Path

View `workflow.log` to see the path taken through the tree:

```
[INFO] Starting workflow check
[DEBUG] State variables: {"git_branch":"main","git_clean":true,...}
[DEBUG] Evaluating node: root
[DEBUG] Condition: {{git_clean}} === true → true
[DEBUG] Following if_true branch to: check_branch
[DEBUG] Evaluating node: check_branch
[DEBUG] Condition: {{git_branch}} === 'main' → true
[DEBUG] Terminal state reached: on_main_branch
```

### Test Conditions Manually

Use Node.js REPL to test your conditions:

```javascript
// Simulate state
const state = {
  git_clean: true,
  git_branch: 'main',
  current_story: null,
  stories_in_progress: []
};

// Test condition
eval('git_clean === true'); // true
eval('git_branch === "main"'); // true
```

### Validate YAML Syntax

Use a YAML validator:
```bash
npx js-yaml cc-devtools/workflow/decision-tree.yaml
```

---

## Next Steps

- [Configure custom reviewers](./REVIEWERS.md)
- [Explore advanced workflow features](./ADVANCED.md)
- [Return to workflow overview](./README.md)
