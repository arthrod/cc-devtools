# Workflow Feature

The workflow feature is an **automated solo developer workflow orchestrator** for Claude Code projects. It analyzes your git and kanban state, makes intelligent decisions about what to do next, and guides you through a complete development workflow from story creation to code review to completion.

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Quick Start](#quick-start)
- [Common Workflows](#common-workflows)
- [CLI Commands](#cli-commands)
- [Slash Commands](#slash-commands)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What is the Workflow System?

The workflow system is a state machine that:

1. **Analyzes State**: Reads git branch/status and kanban stories/subtasks
2. **Makes Decisions**: Uses a YAML decision tree to determine current workflow state
3. **Guides Actions**: Returns actionable JSON telling the LLM what to do next
4. **Orchestrates Reviews**: Runs multiple AI reviewers in parallel, cross-validates findings
5. **Automates Flow**: Automatically progresses through: start work → implement → commit → review → merge → done

### Key Principles

- **One thing in progress at a time** - No parallel work on multiple stories
- **Fully atomic** - Every action triggers exactly one git/kanban command
- **Branch-based workflow** - Main branch only has `todo` and `done` stories
- **Feature branches** - Work happens on feature branches with `in_progress` and `in_review` stories
- **Local-first** - Git operations stay local (never auto-push)
- **AI-powered reviews** - Multiple AI reviewers provide cross-validated feedback

### When to Use Workflow

The workflow feature is ideal when you:

- Want guided, structured development workflow
- Work solo on linear projects (one feature at a time)
- Use feature branches for development
- Want automated code reviews from multiple AI agents
- Need help staying organized and focused

### Requirements

- **Kanban feature** - Workflow depends on kanban for state management (auto-selected during setup)
- **Output-style guidance** - ESSENTIAL for workflow automation. Without output-style guidance, Claude won't know when to run workflow checks or how to interpret results. Setup automatically prompts you to generate this.
- **Git repository** - Project must be a git repository
- **Node.js** - For running CLI commands

---

## How It Works

### The State Machine

The workflow system is built around a **decision tree** that maps (git state + kanban state) → recommended actions.

**Example Decision Flow:**

```
Is git clean?
├─ No → Commit or stash changes first
└─ Yes → Are we on a feature branch?
    ├─ No → On main branch
    │   └─ Any stories in progress?
    │       ├─ Yes → Create feature branch
    │       └─ No → Start next todo story
    └─ Yes → On feature branch
        └─ Current story status?
            ├─ in_progress → Continue implementing
            ├─ in_review → Run automated review
            └─ done → Merge to main and cleanup
```

### State Variables

The decision tree has access to these state variables:

**Git State:**
- `git_branch` - Current branch name
- `git_clean` - True if no uncommitted changes
- `git_last_commit_is_finalized` - True if last commit has "finalize" message
- `modified_files` - List of modified files
- `untracked_files` - List of untracked files

**Kanban State:**
- `current_story` - The story currently in progress
- `current_story_status` - Status of current story (in_progress, in_review, done, todo)
- `current_subtask` - Current subtask being worked on
- `next_story` - Next todo story to work on
- `next_subtask` - Next subtask in current story
- `stories_in_progress` - All stories with in_progress status
- `stories_in_review` - All stories with in_review status
- `subtasks_in_progress` / `subtasks_todo` / `subtasks_done` - Counts

### Automated Review

When a story reaches `in_review` status, the workflow system can orchestrate multiple AI reviewers:

1. **Generate Review Prompt** - Creates comprehensive review prompt with story context
2. **Run Reviewers in Parallel** - Executes multiple AI CLIs simultaneously
3. **Collect Results** - Gathers all reviewer outputs
4. **Store to Kanban** - Saves reviews to story for later reference
5. **Cross-Validation** - LLM compares findings across reviewers to identify false positives

**Supported Reviewers:**
- Claude (Anthropic's official CLI)
- Codex
- Qwen
- Gemini

Each reviewer can be independently enabled/disabled and configured.

---

## Quick Start

### 1. Enable Workflow Feature

```bash
# If setting up a new project
npx cc-devtools setup --features=kanban,workflow

# If adding to existing project
npx cc-devtools add-feature --features=workflow
```

This creates:
- `cc-devtools/workflow/config.yaml` - Main workflow configuration
- `cc-devtools/workflow/decision-tree.yaml` - Decision tree (default)
- `cc-devtools/workflow/reviewers.yaml` - Reviewer configuration
- `cc-devtools/workflow/review-prompt.md` - Review prompt template
- `cc-devtools/workflow/round-1-guidance.md` - Round 1 review guidance
- `cc-devtools/workflow/round-2-guidance.md` - Round 2 review guidance
- `cc-devtools/workflow/round-3-plus-guidance.md` - Round 3+ review guidance

### 2. Configure Reviewers (Optional)

Edit `cc-devtools/workflow/reviewers.yaml` to configure your AI reviewers:

```yaml
reviewers:
  - name: claude
    enabled: true
    command: /path/to/claude
    args:
      - "-p"
      - "___PROMPT___"
      - "--allowedTools"
      - "Bash,Read,Glob,Grep,Write"
    timeout: 900000  # 15 minutes

  - name: codex
    enabled: true
    command: codex
    args:
      - "exec"
      - "___PROMPT___"
      - "--full-auto"
    timeout: 900000
```

**Note**: `___PROMPT___` is a placeholder that gets replaced with the actual review prompt.

### 3. Run Workflow Check

```bash
# Check current workflow state
npx cc-devtools workflow check

# Output:
{
  "state": "ready_to_start_work",
  "gitState": {
    "current_branch": "main",
    "clean": true,
    "last_commit_is_finalized": true
  },
  "kanbanState": {
    "next_item": {
      "id": "story-1",
      "title": "Implement user authentication",
      "status": "todo",
      "type": "story"
    }
  },
  "actionNecessary": "Start work on next todo story",
  "options": [
    {
      "option": "Start Story",
      "description": "Begin work on 'Implement user authentication'",
      "actionNecessary": "npx cc-devtools kanban update-work-item story-1 --status in_progress"
    }
  ]
}
```

### 4. Run Automated Review

When your story is in `in_review` status:

```bash
# Run all enabled reviewers
npx cc-devtools workflow review

# Run specific reviewers only
npx cc-devtools workflow review claude codex

# Cleanup review metadata after review
npx cc-devtools workflow review --cleanup
```

### 5. Generate Output-Style (REQUIRED)

The workflow feature REQUIRES output-style guidance to function:

```bash
# Generate output-style with workflow guidance
npx cc-devtools suggest-output-style
```

This creates essential workflow guidance that:
- Tells Claude when to automatically run `npx cc-devtools workflow check`
- Explains how to interpret and act on the JSON results
- Enables the self-perpetuating workflow loop

It also creates these slash commands:
- `.claude/commands/workflow-check.md` - Quick workflow state check
- `.claude/commands/workflow-start-review.md` - Comprehensive review workflow

**Note:** Setup automatically prompts for output-style generation. If you skipped it, run the command above now.

---

## Common Workflows

### Starting New Work

**Scenario**: You're on main branch with a clean working tree and have a todo story.

```bash
# 1. Check workflow state
npx cc-devtools workflow check
# Output suggests: Start next todo story

# 2. Update story to in_progress
npx cc-devtools kanban update-work-item story-123 --status in_progress

# 3. Create feature branch
git checkout -b feature/story-123

# 4. Check workflow state again
npx cc-devtools workflow check
# Output suggests: Implement the story
```

### Implementing a Story

**Scenario**: You're on a feature branch with a story in progress.

```bash
# 1. Check workflow state
npx cc-devtools workflow check
# Output suggests: Continue implementing

# 2. Make changes to code
# ... edit files ...

# 3. Commit changes
git add .
git commit -m "Implement user login endpoint"

# 4. Check workflow state
npx cc-devtools workflow check
# Output suggests: Continue implementing or move to review
```

### Moving to Review

**Scenario**: You've completed implementation and want to review.

```bash
# 1. Update story to in_review
npx cc-devtools kanban update-work-item story-123 --status in_review

# 2. Check workflow state
npx cc-devtools workflow check
# Output suggests: Run automated review

# 3. Run automated review
npx cc-devtools workflow review
# Reviewers run in parallel and provide feedback

# 4. Review findings
npx cc-devtools kanban get story-123
# Reviews are stored in story's review field
```

### Completing Work

**Scenario**: Reviews are done, all issues resolved, ready to merge.

```bash
# 1. Ensure all changes are committed
git status

# 2. Switch to main branch
git checkout main

# 3. Merge feature branch
git merge feature/story-123

# 4. Update story to done
npx cc-devtools kanban update-work-item story-123 --status done

# 5. Delete feature branch (optional)
git branch -d feature/story-123

# 6. Check workflow state
npx cc-devtools workflow check
# Output suggests: Start next todo story
```

### Handling Multiple Subtasks

**Scenario**: Your story has multiple subtasks to complete.

```bash
# 1. Check workflow state
npx cc-devtools workflow check
# Output shows current subtask and next subtask

# 2. Complete current subtask
npx cc-devtools kanban update-work-item subtask-1 --status done

# 3. Start next subtask
npx cc-devtools kanban update-work-item subtask-2 --status in_progress

# 4. Repeat until all subtasks done
# Then move story to in_review
```

---

## CLI Commands

### `workflow check`

Check current workflow state and get recommendations.

```bash
npx cc-devtools workflow check [options]
```

**Options:**
- `--config <path>` - Use custom config file (default: `cc-devtools/workflow/config.yaml`)
- `--pretty` - Pretty-print JSON output

**Output:**
Returns JSON with:
- `state` - Current workflow state name
- `gitState` - Git repository state
- `kanbanState` - Kanban stories/subtasks state
- `actionNecessary` - Recommended action description
- `options` - Array of available options with actions
- `error` - Error message (if any)
- `warning` - Warning message (if any)

**Examples:**

```bash
# Basic check
npx cc-devtools workflow check

# Use custom config
npx cc-devtools workflow check --config ./custom-workflow.yaml

# Pretty output
npx cc-devtools workflow check --pretty
```

### `workflow review`

Run automated code review with configured AI reviewers.

```bash
npx cc-devtools workflow review [reviewers...] [options]
```

**Arguments:**
- `reviewers` - Optional list of reviewer names to run (default: all enabled)

**Options:**
- `--cleanup` - Cleanup review metadata files after review
- `--pretty` - Pretty-print JSON output

**Output:**
Returns JSON with:
- `reviews` - Array of review results
  - `reviewer` - Reviewer name
  - `success` - True if reviewer completed successfully
  - `timedOut` - True if reviewer timed out
  - `error` - Error message (if any)
- `summary` - Counts of successful/failed/timed-out reviews

**Examples:**

```bash
# Run all enabled reviewers
npx cc-devtools workflow review

# Run specific reviewers
npx cc-devtools workflow review claude codex

# Run and cleanup metadata
npx cc-devtools workflow review --cleanup

# Run with pretty output
npx cc-devtools workflow review --pretty
```

---

## Slash Commands

### `/workflow-check`

Quick workflow state check. Read-only command that shows current state and recommendations.

**Usage:**
```
/workflow-check
```

**What it does:**
1. Runs `npx cc-devtools workflow check`
2. Interprets the JSON output
3. Provides clear, actionable recommendations
4. Shows current story/subtask context

**When to use:**
- Before starting work
- After completing a task
- When unsure what to do next
- To verify workflow state

### `/workflow-start-review`

Comprehensive code review workflow with multiple phases.

**Usage:**
```
/workflow-start-review
```

**What it does:**
1. **Pre-research Phase**
   - Reviews story requirements
   - Examines changed files
   - Checks memory for past issues
   - Identifies reviewers for current round

2. **Review Orchestration**
   - Generates detailed review prompt
   - Runs multiple AI reviewers in parallel
   - Collects all review outputs

3. **Cross-Validation Phase**
   - Compares findings across reviewers
   - Identifies consensus issues
   - Flags potential false positives
   - Creates actionable table of findings

4. **Decision Making**
   - Presents findings in interactive table
   - User decides: approve, request changes, or reject
   - Creates new stories/subtasks for changes
   - Updates story status accordingly

5. **Follow-up Actions**
   - Stores reviews to kanban
   - Stores false positives to memory
   - Creates subtasks for required changes
   - Triggers next workflow state

**When to use:**
- When story is in `in_review` status
- After completing implementation
- Before merging to main branch
- To get comprehensive code review

---

## Configuration

### Main Config (`cc-devtools/workflow/config.yaml`)

```yaml
# Workflow Configuration
version: 1

# Decision tree
decisionTree:
  # Use built-in default tree
  source: default

  # Or use custom tree file
  # source: file
  # path: ./custom-decision-tree.yaml

# Logging
logging:
  enabled: true
  file: workflow.log
  level: info  # info | debug | error

# Integration
kanban:
  # How to invoke kanban (internal or cli)
  mode: internal  # internal (use direct imports) | cli (use npx)
```

**Options:**

- `decisionTree.source`: `default` (use built-in tree) or `file` (load from path)
- `decisionTree.path`: Path to custom decision tree YAML file
- `logging.enabled`: Enable/disable workflow logging
- `logging.file`: Log file path (relative to project root)
- `logging.level`: Log verbosity (`info`, `debug`, `error`)
- `kanban.mode`: `internal` (use direct imports) or `cli` (use npx commands)

### Reviewer Config (`cc-devtools/workflow/reviewers.yaml`)

```yaml
# Reviewer Configuration
version: 1

# Global settings
defaults:
  timeout: 900000  # 15 minutes
  metadataDir: .tmp
  promptTemplate: default

# Reviewer definitions
reviewers:
  - name: claude
    enabled: true
    command: /path/to/claude
    args:
      - "-p"
      - "___PROMPT___"
      - "--allowedTools"
      - "Bash,Read,Glob,Grep"
    timeout: 900000

# Review settings
review:
  autoGenerate: true
  autoCleanup: false
  storage:
    enabled: true
    storeFalsePositives: true
```

**Options:**

- `defaults.timeout`: Default timeout for all reviewers (milliseconds)
- `defaults.metadataDir`: Directory for review metadata files
- `reviewers[].enabled`: Enable/disable individual reviewer
- `reviewers[].command`: CLI command to execute
- `reviewers[].args`: Arguments passed to CLI (use `___PROMPT___` placeholder)
- `reviewers[].timeout`: Override timeout for specific reviewer
- `review.autoGenerate`: Auto-generate review prompts
- `review.autoCleanup`: Auto-cleanup metadata after successful review
- `review.storage.enabled`: Store reviews to kanban
- `review.storage.storeFalsePositives`: Store false positives to memory

### Decision Tree (`cc-devtools/workflow/decision-tree.yaml`)

See [DECISION_TREE.md](./DECISION_TREE.md) for detailed documentation on customizing the decision tree.

### Review Prompt Template (`cc-devtools/workflow/review-prompt.md`)

The review prompt template controls what instructions are sent to AI reviewers. You can customize this file to tailor the review process to your project's needs.

**Default Location**: `cc-devtools/workflow/review-prompt.md`

**Template Variables**:
The template supports the following placeholders that are automatically replaced:
- `{{storyId}}` - The ID of the story being reviewed
- `{{storyTitle}}` - The title of the story
- `{{roundNumber}}` - The review round number (1, 2, 3, etc.)
- `{{gitBranch}}` - The current git branch name
- `{{roundGuidance}}` - Auto-generated round-specific guidance

**Example Customizations**:

1. **Add project-specific code quality rules**:
   ```markdown
   ### 1. Code Quality & Style

   **Project-Specific Rules:**
   - All functions must have JSDoc comments
   - Use our custom error handling pattern (src/utils/errors.ts)
   - Follow our naming convention: PascalCase for classes, camelCase for functions

   [... rest of template ...]
   ```

2. **Focus on specific security concerns**:
   ```markdown
   ### 5. Security & Data Safety

   **⚠️ CRITICAL FOR THIS PROJECT:**
   - ALL user inputs must be sanitized using our sanitize() helper
   - Database queries MUST use parameterized statements
   - API keys must NEVER be committed (check .env.example instead)

   [... rest of template ...]
   ```

3. **Add custom review checklist items**:
   ```markdown
   ### 8. Project-Specific Checks
   - ✓ All new features have corresponding e2e tests
   - ✓ Breaking changes are documented in CHANGELOG.md
   - ✓ Database migrations include rollback scripts
   - ✓ New API endpoints are added to OpenAPI spec
   ```

4. **Modify the role description**:
   ```markdown
   ## Your Role

   You are an **expert code reviewer** for a financial services platform with expertise in:
   - **TypeScript** and Node.js best practices
   - **PCI-DSS compliance** and financial data security
   - **High-availability systems** and fault tolerance
   - **Regulatory compliance** (SOC 2, GDPR)
   ```

**How to Customize**:

1. **Edit the template file**:
   ```bash
   # Open in your editor
   code cc-devtools/workflow/review-prompt.md
   ```

2. **Modify the sections** you want to customize while keeping the template variables intact

3. **Test your changes**:
   ```bash
   # Run a review to see how the new prompt affects reviewer output
   npx cc-devtools workflow review
   ```

**Important Notes**:
- Keep the template variables (e.g., `{{storyId}}`) intact - they're replaced at runtime
- The `{{roundGuidance}}` variable is generated based on the review round number
- Changes apply to all future reviews immediately
- You can revert to the default by deleting the file and running `npx cc-devtools setup` again

**Best Practices**:
- Include specific examples of what to look for
- Reference your project's documentation and style guides
- Keep the prompt focused and actionable
- Update the template as your project evolves
- Version control the template file with your project

### Round Guidance Templates

The review system uses different guidance for each review round to adjust the acceptance bar appropriately. These templates control what standards reviewers apply in each round.

**Template Files**:
- `cc-devtools/workflow/round-1-guidance.md` - Initial review (standard acceptance bar)
- `cc-devtools/workflow/round-2-guidance.md` - Second review (raised acceptance bar)
- `cc-devtools/workflow/round-3-plus-guidance.md` - Third and subsequent reviews (very high acceptance bar)

**Template Variables**:
- Round 3+ template supports `{{roundNumber}}` which will be replaced with the actual round number (3, 4, 5, etc.)
- Round 1 and 2 templates are static (no variables)

**Example Customizations**:

1. **Adjust round 1 standards for early-stage projects**:
   ```markdown
   **Round 1 - Initial Review (MVP Phase):**
   - Focus on: Core functionality and critical bugs only
   - Accept: Quick implementations that meet acceptance criteria
   - Report: Issues that prevent the story from being functionally complete
   - Skip: Production hardening, advanced error handling, edge cases
   ```

2. **Modify round 2 for production projects**:
   ```markdown
   **Round 2 - Follow-up Review (Production Standards):**
   - Focus on: Security, data integrity, error handling, and edge cases
   - Report: Issues that could cause production incidents
   - Check: All reviewer feedback from round 1 has been addressed
   - Verify: Tests cover critical paths and error scenarios
   ```

3. **Customize round 3+ for your team's workflow**:
   ```markdown
   **Round {{roundNumber}} - Subsequent Review:**
   - **STOP AND EVALUATE:**
   - This is round {{roundNumber}}. Why are we still in review?
   - Are we scope-creeping? Are the acceptance criteria actually met?
   - Are we holding this to unrealistic standards?

   **ONLY report these CRITICAL issues:**
   - Security vulnerabilities that could lead to data breaches
   - Data corruption or loss scenarios
   - Application crashes or unavailability
   - Clear violations of acceptance criteria

   **DO NOT report:**
   - Code style preferences
   - Performance optimizations (unless causing actual problems)
   - Feature requests outside the original scope
   - "Nice to have" improvements
   ```

**How It Works**:
- When generating a review prompt, the system reads the appropriate round guidance template
- The guidance is inserted into the main review prompt in the "Round-Specific Guidance" section
- For round 3+, the `{{roundNumber}}` placeholders are replaced with the actual round number
- Each round's guidance helps reviewers calibrate their expectations appropriately

**Why Multiple Rounds?**:
- **Round 1**: Initial implementation - reviewers help catch issues early
- **Round 2**: Verification - ensure round 1 feedback was addressed properly
- **Round 3+**: Final verification - very high bar to prevent endless review cycles

**Best Practices**:
- Keep round 1 guidance focused on core functionality
- Make round 2 progressively stricter
- Use round 3+ to discourage endless iterations
- Adjust the guidance based on your project phase (MVP vs production)
- Consider your team's workflow - some teams may want stricter or looser standards

---

## Troubleshooting

### Workflow check returns error

**Problem**: `npx cc-devtools workflow check` returns an error.

**Solutions:**
1. Check that kanban is enabled: `npx cc-devtools status`
2. Verify config files exist: `ls cc-devtools/workflow/`
3. Check workflow log: `cat workflow.log`
4. Verify git repository: `git status`

### Reviewers timeout

**Problem**: All reviewers timeout without completing.

**Solutions:**
1. Increase timeout in `reviewers.yaml`: `timeout: 1800000` (30 minutes)
2. Run fewer reviewers: `npx cc-devtools workflow review claude`
3. Check reviewer CLI is working: `claude -p "test"` (or your reviewer command)
4. Check review metadata: `ls .tmp/`

### Workflow suggests wrong action

**Problem**: Workflow recommends an action that doesn't make sense.

**Solutions:**
1. Check git state: `git status`, `git branch`
2. Check kanban state: `npx cc-devtools kanban list`
3. Enable debug logging: Edit `config.yaml`, set `logging.level: debug`
4. Review log file: `cat workflow.log`
5. Manually fix state if needed (update story status, change branch, commit changes)

### Review prompt not generated

**Problem**: Review command fails because prompt file doesn't exist.

**Solutions:**
1. Verify story is in review: `npx cc-devtools kanban get <story-id>`
2. Check metadata directory exists: `mkdir -p .tmp`
3. Enable auto-generate: Edit `reviewers.yaml`, set `review.autoGenerate: true`
4. Manually create prompt: Save prompt to `.tmp/review-prompt.txt`

### Workflow state is stuck

**Problem**: Workflow keeps recommending the same action repeatedly.

**Solutions:**
1. Execute the recommended action to progress state
2. Check if there's a conflict in git/kanban state
3. Review the decision tree logic: Check `decision-tree.yaml`
4. Enable debug logging to see decision path
5. Manually reset state if needed:
   - Commit or stash changes: `git add . && git commit -m "WIP"`
   - Update story status: `npx cc-devtools kanban update-work-item <id> --status in_progress`
   - Switch branches: `git checkout main`

### Reviews not stored to kanban

**Problem**: After review, findings aren't saved to story.

**Solutions:**
1. Check storage is enabled: `reviewers.yaml` → `review.storage.enabled: true`
2. Verify kanban integration: `npx cc-devtools kanban get <story-id>`
3. Check review metadata exists: `ls .tmp/*-review.txt`
4. Check for errors in output: `npx cc-devtools workflow review --pretty`

### Can't find reviewer CLI

**Problem**: Reviewer fails with "command not found".

**Solutions:**
1. Use full path to CLI: `/Users/username/.claude/local/claude`
2. Add CLI to PATH: `export PATH="$PATH:/path/to/cli"`
3. Verify CLI is executable: `chmod +x /path/to/cli`
4. Test CLI manually: `/path/to/cli -p "test"`

---

## Next Steps

- [Learn about customizing the decision tree](./DECISION_TREE.md)
- [Configure custom reviewers](./REVIEWERS.md)
- [Explore advanced workflow features](./ADVANCED.md)
- [Return to main cc-devtools README](../../README.md)
