# Kanban Slash Commands

The Kanban tool includes 10 slash command templates that provide convenient shortcuts for common kanban operations. These commands are automatically copied to `.claude/commands/` when you run setup with the kanban feature enabled.

## Available Commands

### `/kanban-next`
Get the next recommended work item based on priorities, dependencies, and current progress.

**When to use:** Starting a new task, looking for what to work on next

### `/kanban-board`
Display the entire kanban board with all stories organized by status and phase.

**When to use:** Getting overview of project, planning work, sprint reviews

### `/kanban-list`
List stories with flexible filtering options (status, phase, priority, tags).

**When to use:** Finding specific stories, reviewing work, filtering tasks

### `/kanban-detail`
Get detailed information about a specific story including subtasks, dependencies, and history.

**When to use:** Understanding story requirements, reviewing acceptance criteria

### `/kanban-move`
Move a story or subtask to a different status with validation.

**When to use:** Updating work status, marking tasks complete, blocking items

### `/kanban-start-work`
Begin work on a story by moving it to in_progress and setting up context.

**When to use:** Starting a new story, context switching between tasks

### `/kanban-update-progress`
Update progress on current work including subtask completion and blocker identification.

**When to use:** Daily standup updates, mid-task status changes

### `/kanban-add-stories`
Add new stories to the kanban board with proper structure and validation.

**When to use:** Planning new features, capturing requirements, adding work items

### `/kanban-add-subtasks`
Break down stories into actionable subtasks with dependencies.

**When to use:** Task breakdown, sprint planning, defining implementation steps

### `/kanban-groom`
Review and refine your kanban board by updating priorities, adding details, and organizing work.

**When to use:** Sprint planning sessions, board grooming, story refinement

## Installation

Slash commands are automatically installed when you:

1. Run `npx cc-devtools setup`
2. Select the kanban feature
3. Choose "yes" when prompted about slash command templates

They will be copied to `.claude/commands/` in your project.

## Usage

Once installed, you can use these commands in Claude Code by typing `/` followed by the command name:

```
/kanban-next
```

The slash command will expand into a detailed prompt that instructs Claude on how to use the Kanban MCP tools.

## Customization

The slash command templates are copied to your project, so you can customize them:

1. Navigate to `.claude/commands/`
2. Edit the `.md` file for any command
3. Modify the prompt to suit your workflow
4. Save and the changes take effect immediately

## Technical Details

- **Format:** Markdown files in `.claude/commands/`
- **Naming:** `kanban-{command-name}.md`
- **Source:** Copied from `node_modules/@shaenchen/cc-devtools/templates/commands/`
- **Customizable:** Yes, files are owned by your project after setup

## Related Documentation

- [Kanban Tool Documentation](./README.md)
- [Story Schema](./story-schema.md)
- [Subtask Schema](./subtask-schema.md)
