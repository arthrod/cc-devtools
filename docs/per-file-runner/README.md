# Per-File Runner

Run commands on files matching glob patterns with intelligent state tracking. The per-file runner is designed for batch processing files with AI tools (like Claude CLI), automated code transformations, or any command-line tool that processes individual files.

## Overview

The per-file runner solves a common problem: how to efficiently run a command on many files, track which files have been processed, and handle failures gracefully. It uses MD5 hashing to detect file changes and only processes files that are new or have been modified since the last run.

**Perfect for:**
- Running AI prompts on multiple files (e.g., "add documentation to all TypeScript files")
- Automated code transformations
- Batch processing with any CLI tool
- Continuous processing with automatic retries

## Quick Start

### 1. Create Configuration

Create `cc-devtools/per-file-runner.yaml`:

```yaml
configs:
  - id: add-docs
    name: Add Documentation
    prompt: |
      Review the file {filename} and add JSDoc comments to all exported functions.
      Follow the project's existing documentation style.
    priority: 1
    glob:
      include:
        - "src/**/*.ts"
      exclude:
        - "node_modules/**"
        - "dist/**"
        - "**/*.test.ts"
    command: claude
    args:
      - "-p"
      - "___PROMPT___"
    timeout: 300000
```

### 2. Check Status

See which files need processing:

```bash
npx cc-devtools per-file-runner status add-docs
```

### 3. Run with Dry-Run

Preview what would be executed:

```bash
npx cc-devtools per-file-runner run add-docs --dry-run
```

### 4. Run for Real

Process all files:

```bash
npx cc-devtools per-file-runner run add-docs
```

## Configuration Reference

### Config Structure

```yaml
configs:
  - id: string              # Unique identifier
    name: string            # Human-readable name
    prompt: string          # Prompt template with {filename} placeholder
    priority: number        # Priority for run-all (lower runs first)
    glob:
      include: string[]     # Glob patterns to match
      exclude: string[]     # Glob patterns to exclude (optional)
    command: string         # Command to execute
    args: string[]          # Command arguments (use ___PROMPT___ placeholder)
    timeout: number         # Timeout in milliseconds
```

### Placeholder Substitution

The per-file runner uses two placeholders:

1. **`{filename}`** in the `prompt` field
   - Replaced with the actual file path
   - Example: `{filename}` → `src/utils/helpers.ts`

2. **`___PROMPT___`** in the `args` array
   - Replaced with the prompt after `{filename}` substitution
   - Example: `"___PROMPT___"` → `"Review the file src/utils/helpers.ts and..."`

**Full example:**
```yaml
prompt: "Process {filename}"
args: ["-p", "___PROMPT___"]

# For file "src/index.ts", executes:
# command -p "Process src/index.ts"
```

## Commands

### `status <id>`

Show the status of all files for a specific config.

```bash
npx cc-devtools per-file-runner status add-docs
```

**Output:**
```
Status for config: Add Documentation (add-docs)
============================================================

NEW (15):
  - src/cli/commands/add-feature/index.ts
  - src/cli/commands/kanban/add-review.ts
  ...

OUT-OF-DATE (3):
  - src/shared/utils.ts
  - src/core/parser.ts
  ...

UP-TO-DATE (208):
  - src/cli/index.ts
  - src/kanban/index.ts
  ...
```

**File States:**
- **NEW**: File not previously processed (no hash recorded)
- **OUT-OF-DATE**: File modified since last successful run (hash changed)
- **UP-TO-DATE**: File unchanged since last successful run

### `status-all`

Show status for all configs:

```bash
npx cc-devtools per-file-runner status-all
```

### `run <id> [--dry-run]`

Run command for a specific config on all files that need processing.

```bash
# Run for real
npx cc-devtools per-file-runner run add-docs

# Preview what would execute
npx cc-devtools per-file-runner run add-docs --dry-run
```

**Behavior:**
- Processes NEW files first, then OUT-OF-DATE files
- Stops immediately on first failure
- Updates hash only on successful execution (exit code 0)
- Shows timestamped logs for each file

**Example output:**
```
2025-10-27 14:03:15 Running config: Add Documentation (add-docs)
2025-10-27 14:03:15 Found 18 files to process
2025-10-27 14:03:15 Processing file src/cli/index.ts with claude...
2025-10-27 14:03:42 Processing file src/cli/index.ts...OK
2025-10-27 14:03:42 Processing file src/kanban/index.ts with claude...
2025-10-27 14:04:08 Processing file src/kanban/index.ts...OK
...
```

### `run-all [--dry-run]`

Run all configs in priority order (lower priority numbers run first).

```bash
npx cc-devtools per-file-runner run-all
```

**Behavior:**
- Sorts configs by priority
- Runs each config sequentially
- Stops if any config fails
- Useful for multi-stage processing pipelines

### `automatic`

Continuously run `run-all` with automatic retry logic.

```bash
npx cc-devtools per-file-runner automatic
```

**Behavior:**
- Runs `run-all` in a loop
- **On success**: Wait 1 minute, then retry
- **On failure**: Wait 1 hour, then retry
- Runs forever until stopped (Ctrl+C)

**Use cases:**
- Continuous processing of incoming files
- Keeping files in sync with external changes
- Automated maintenance tasks

**Example:**
```
2025-10-27 14:05:00 Starting automatic mode
2025-10-27 14:05:00 Will run all configs on repeat
2025-10-27 14:05:00 Success: retry in 1 minute | Failure: retry in 1 hour
2025-10-27 14:05:00 Running config: Add Documentation (add-docs)
2025-10-27 14:05:00 All files are up-to-date
2025-10-27 14:05:00 All configs completed successfully
2025-10-27 14:05:00 Waiting 1 minute to continue processing...
```

### `reset <id>`

Reset state for a config (clears all file hashes, marks all files as NEW).

```bash
npx cc-devtools per-file-runner reset add-docs
```

**Use when:**
- You want to re-process all files
- Command or prompt changed significantly
- State file became corrupted

### `reset-file <id> <file>`

Reset state for a specific file (removes hash, marks file as NEW).

```bash
npx cc-devtools per-file-runner reset-file add-docs src/index.ts
```

**Use when:**
- Want to re-process a single file
- File was processed incorrectly
- Testing changes to command/prompt

## State Tracking

### How It Works

1. **First Run**: All matched files are marked as NEW
2. **Processing**: For each file processed successfully, record its MD5 hash
3. **Next Run**: Compare current hash with recorded hash
   - Hash missing → NEW
   - Hash different → OUT-OF-DATE
   - Hash same → UP-TO-DATE
4. **File Removal**: If a file no longer matches the glob, it's removed from state

### State File Format

`cc-devtools/per-file-runner-state.yaml`:

```yaml
states:
  - id: add-docs
    currentFiles:
      - file: src/cli/index.ts
        last_hash: "abc123def456..."
        last_state: up-to-date
      - file: src/kanban/index.ts
        last_hash: null
        last_state: new
      - file: src/shared/utils.ts
        last_hash: "def456abc123..."
        last_state: out-of-date
```

**Fields:**
- `file`: Relative file path from project root
- `last_hash`: MD5 hash from last successful run (null if never processed)
- `last_state`: Current status (new, out-of-date, up-to-date)

### Git Workflow

Both configuration and state files can be committed to git:

```bash
# Track config (team configuration)
git add cc-devtools/per-file-runner.yaml

# Track state (shared team state - optional)
git add cc-devtools/per-file-runner-state.yaml
```

**Committing state:**
- ✅ **Yes**: If you want team members to share processing state
- ❌ **No**: If each developer should process files independently

## Error Handling

### Exit Codes

The per-file runner checks command exit codes:

- **Exit code 0**: Success → update hash
- **Non-zero exit code**: Failure → stop processing, keep old hash

**Example:**
```
2025-10-27 14:03:15 Processing file src/broken.ts with claude...
2025-10-27 14:03:20 ERROR: Processing file src/broken.ts...FAILED: Command exited with code 1
```

### API Failures

Most CLI tools (Claude, Codex, Gemini) return non-zero exit codes on:
- Network failures
- Rate limit errors
- Authentication errors
- API errors

This means the per-file runner will automatically stop on these errors.

### Recovery

After fixing the error:

```bash
# Just run again - it will resume where it failed
npx cc-devtools per-file-runner run add-docs
```

Files that were successfully processed are skipped (hash matches).

## Multiple Configs

You can define multiple configs with different priorities:

```yaml
configs:
  - id: add-types
    name: Add Type Annotations
    priority: 1
    glob:
      include: ["src/**/*.ts"]
    command: claude
    args: ["-p", "___PROMPT___"]
    # ...

  - id: add-tests
    name: Generate Tests
    priority: 2
    glob:
      include: ["src/**/*.ts"]
      exclude: ["**/*.test.ts"]
    command: claude
    args: ["-p", "___PROMPT___"]
    # ...

  - id: add-docs
    name: Add Documentation
    priority: 3
    glob:
      include: ["src/**/*.ts"]
    command: claude
    args: ["-p", "___PROMPT___"]
    # ...
```

**Run all in order:**
```bash
npx cc-devtools per-file-runner run-all
```

This processes:
1. All files with `add-types` (priority 1)
2. All files with `add-tests` (priority 2)
3. All files with `add-docs` (priority 3)

## Advanced Usage

### Custom Commands

You can use any command-line tool:

```yaml
# Python script
command: python
args:
  - "scripts/process.py"
  - "--file"
  - "___PROMPT___"

# Shell script
command: bash
args:
  - "scripts/transform.sh"
  - "___PROMPT___"

# Node.js script
command: node
args:
  - "scripts/migrate.js"
  - "___PROMPT___"
```

### Complex Prompts

Use YAML's multiline strings for complex prompts:

```yaml
prompt: |
  Review the file {filename} and perform the following tasks:

  1. Add comprehensive JSDoc comments to all exported functions
  2. Add type annotations where missing
  3. Fix any ESLint warnings
  4. Ensure consistent code style

  Follow these guidelines:
  - Use clear, concise descriptions
  - Document all parameters and return values
  - Include examples for complex functions

  Do not modify the function logic, only add documentation and types.
```

### Conditional Processing

Use glob patterns to selectively process files:

```yaml
# Only process files in specific directories
glob:
  include:
    - "src/components/**/*.tsx"
    - "src/pages/**/*.tsx"

# Exclude test files, build output, and dependencies
glob:
  include:
    - "src/**/*.ts"
  exclude:
    - "**/*.test.ts"
    - "**/*.spec.ts"
    - "dist/**"
    - "node_modules/**"
    - "coverage/**"
```

### Timeout Management

Set appropriate timeouts based on file size and operation complexity:

```yaml
# Short timeout for simple operations
timeout: 60000  # 1 minute

# Medium timeout for AI processing
timeout: 300000  # 5 minutes

# Long timeout for complex operations
timeout: 900000  # 15 minutes
```

## Best Practices

### 1. Start with Dry-Run

Always test with `--dry-run` first:

```bash
npx cc-devtools per-file-runner run add-docs --dry-run
```

### 2. Test on a Subset

Create a test config for a small subset of files:

```yaml
configs:
  - id: test-add-docs
    # ... same as add-docs but limited glob
    glob:
      include:
        - "src/utils/**/*.ts"  # Just one directory
```

### 3. Use Version Control

Commit your files before running:

```bash
git commit -am "Before per-file-runner"
npx cc-devtools per-file-runner run add-docs
git diff  # Review changes
```

### 4. Set Appropriate Timeouts

Consider the operation when setting timeout:
- Simple transformations: 30-60 seconds
- AI processing: 3-5 minutes
- Complex operations: 10-15 minutes

### 5. Handle Failures Gracefully

The runner stops on first failure. This is intentional:
- Prevents cascading errors
- Preserves system resources
- Allows you to fix issues before continuing

### 6. Monitor Logs

The runner provides detailed timestamped logs:
- Track progress
- Identify slow operations
- Debug issues

### 7. Use Priorities Wisely

Order configs by dependency:
- Priority 1: Add types (other operations depend on types)
- Priority 2: Add tests (tests depend on types)
- Priority 3: Add docs (docs are final step)

## Troubleshooting

### Files Not Being Detected

**Problem:** `status` shows 0 files

**Solutions:**
- Check glob patterns match your files
- Verify file paths are relative to project root
- Test glob pattern in isolation
- Check exclude patterns aren't too broad

### All Files Showing as NEW

**Problem:** Every run treats all files as new

**Solutions:**
- Verify command returns exit code 0 on success
- Check file permissions on state file
- Ensure state file isn't being deleted between runs
- Verify command doesn't modify files (changing hash)

### Command Not Found

**Problem:** `Error: Command 'claude' not found`

**Solutions:**
- Verify command is installed and in PATH
- Use full path to command: `/usr/local/bin/claude`
- Test command manually in terminal

### Timeout Errors

**Problem:** Commands timing out frequently

**Solutions:**
- Increase timeout value
- Check for network issues (API calls)
- Simplify prompt to reduce processing time
- Check for rate limiting

### State File Conflicts

**Problem:** Git merge conflicts in state file

**Solutions:**
- Add to `.gitignore` if state shouldn't be shared
- Use `reset` command to rebuild state
- Manually resolve conflicts (YAML is human-readable)

## Examples

See [EXAMPLES.md](./EXAMPLES.md) for detailed real-world examples.

## Related Tools

- **Kanban**: Track implementation work
- **Memory**: Store decisions about file processing
- **Planner**: Plan multi-stage file processing workflows
- **Workflow**: Automate the entire development workflow

## Support

For issues or questions:
- [GitHub Issues](https://github.com/shaenchen/cc-devtools/issues)
- [Main Documentation](../../README.md)
