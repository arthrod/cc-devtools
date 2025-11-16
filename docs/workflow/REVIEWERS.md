# Reviewer Configuration

The automated review system orchestrates multiple AI reviewers to analyze your code in parallel. This document explains how to configure reviewers and add custom reviewers to your workflow.

## Table of Contents

- [Overview](#overview)
  - [What is Automated Review?](#what-is-automated-review)
  - [Why Multiple Reviewers?](#why-multiple-reviewers)
  - [Reviewer Trust Levels](#reviewer-trust-levels)
- [Reviewer Configuration File](#reviewer-configuration-file)
- [Built-in Reviewers](#built-in-reviewers)
- [Adding Custom Reviewers](#adding-custom-reviewers)
- [Reviewer CLI Requirements](#reviewer-cli-requirements)
- [Timeout and Error Handling](#timeout-and-error-handling)
- [Review Storage](#review-storage)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What is Automated Review?

The automated review system:

1. **Generates Review Prompt** - Creates comprehensive prompt with story context
2. **Runs Reviewers in Parallel** - Executes multiple AI CLIs simultaneously
3. **Handles Timeouts** - Manages reviewer timeouts gracefully
4. **Collects Results** - Gathers all reviewer outputs
5. **Stores Reviews** - Saves results to kanban for later reference
6. **Cross-Validation** - Enables LLM to compare findings across reviewers

### Why Multiple Reviewers?

Different AI models have different strengths:

- **Claude**: Excellent at architectural analysis and best practices
- **Codex**: Strong at catching logic errors and edge cases
- **Qwen**: Good at security vulnerabilities and performance issues
- **Gemini**: Effective at code quality and maintainability

Running multiple reviewers provides:
- **Cross-validation** - Multiple perspectives on issues
- **Higher confidence** - Issues found by multiple reviewers are likely real
- **Broader coverage** - Different models notice different things
- **False positive detection** - Issues found by only one reviewer may be false positives

### Reviewer Trust Levels

The review workflow supports designating certain reviewers as **"junior reviewers"**. This affects how their findings are validated during the cross-validation phase.

**Junior Reviewer Characteristics:**
- Findings receive **enhanced scrutiny** and validation
- Issues found **only by junior reviewers** require code-level verification
- Their findings are given **lower weight** when compared against other reviewers
- Helps **catch false positives** while still benefiting from their unique perspectives
- Useful for reviewers that are valuable but produce more false positives

**Default Configuration:**
- By default, **Qwen is marked as a junior reviewer** in the workflow template
- **All other reviewers** (Claude, Codex, Gemini) are treated equally without special designation
- Users can customize these designations by editing the workflow template

**How It Works:**
During the `/workflow-start-review` command, the orchestrating LLM (Claude Code):
1. Identifies which issues were found only by junior reviewers
2. Reads the actual code to verify the junior reviewer's claims
3. Cross-references with what other reviewers found (or didn't find)
4. Makes an independent determination: Valid | False Positive | Partially Valid | Stylistic Only
5. Gives credit when junior reviewers catch valid issues others missed
6. Confidently rejects findings that are incorrect with clear explanations

**Customization:**
To modify which reviewers are considered junior, edit the workflow template:
- **File**: `templates/commands/workflow/workflow-start-review.md`
- **Search for**: "junior reviewer" or "Qwen is a junior reviewer"
- **Update**: Change reviewer names as needed in multiple locations

**When to Mark a Reviewer as Junior:**
- The reviewer is known to produce more false positives
- You want additional validation of their findings before accepting
- The reviewer is newer or less proven in your workflow
- You want to benefit from their unique perspective but with added verification
- You're testing a new reviewer and want extra scrutiny initially

**Benefits:**
- **Balanced perspective**: Get value from all reviewers while managing false positives
- **Quality control**: Ensure lower-confidence findings are validated before creating work items
- **Learning system**: Over time, you can promote reviewers as their accuracy improves
- **Flexible weighting**: Different reviewers can have different trust levels based on your experience

This approach allows you to benefit from multiple perspectives while applying appropriate levels of scrutiny based on each reviewer's track record in your specific codebase.

---

## Reviewer Configuration File

### Location

`cc-devtools/workflow/reviewers.yaml`

### Full Example

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
    command: /Users/username/.claude/local/claude
    args:
      - "-p"
      - "___PROMPT___"
      - "--allowedTools"
      - "Bash,Read,Glob,Grep,Write"
      - "--allowedTools"
      - "mcp__cc-devtools-kanban__*,mcp__cc-devtools-memory__*"
    timeout: 900000

  - name: codex
    enabled: true
    command: codex
    args:
      - "exec"
      - "___PROMPT___"
      - "--full-auto"
    timeout: 900000

  - name: qwen
    enabled: false
    command: qwen
    args:
      - "-p"
      - "___PROMPT___"
      - "--approval-mode"
      - "yolo"
      - "--allowed-tools"
      - "read_file,search_file_content,glob,run_shell_command,write_file"
      - "--allowed-mcp-server-names"
      - "cc-devtools-kanban,cc-devtools-memory"
    timeout: 900000

# Review settings
review:
  autoGenerate: true
  autoCleanup: false
  storage:
    enabled: true
    storeFalsePositives: true
```

### Configuration Sections

#### 1. Global Defaults

```yaml
defaults:
  timeout: 900000        # Default timeout in milliseconds (15 min)
  metadataDir: .tmp      # Directory for review metadata
```

**Options:**
- `timeout`: Default timeout for all reviewers (can be overridden per reviewer)
- `metadataDir`: Where to store review metadata files

**Note**: The review prompt template is now read from `cc-devtools/workflow/review-prompt.md`. See the [main workflow README](./README.md#review-prompt-template-cc-devtoolsworkflowreview-promptmd) for customization instructions.

#### 2. Reviewer Definitions

```yaml
reviewers:
  - name: claude          # Unique reviewer name
    enabled: true         # Enable/disable this reviewer
    command: /path/to/cli # Full path to CLI executable
    args:                 # Arguments passed to CLI
      - "-p"
      - "___PROMPT___"    # Placeholder for prompt
    timeout: 900000       # Override default timeout
```

**Fields:**
- `name`: Unique identifier (used in commands like `npx cc-devtools workflow review claude`)
- `enabled`: Set to `false` to disable without removing configuration
- `command`: Path to CLI executable (full path recommended)
- `args`: Array of command-line arguments
- `timeout`: Timeout in milliseconds (optional, uses default if not specified)

**Important**: `___PROMPT___` is a special placeholder that gets replaced with the actual review prompt file path.

#### 3. Review Settings

```yaml
review:
  autoGenerate: true           # Auto-generate review prompts
  autoCleanup: false           # Auto-cleanup metadata after review
  storage:
    enabled: true              # Store reviews to kanban
    storeFalsePositives: true  # Store false positives to memory
```

**Options:**
- `autoGenerate`: If true, automatically generates review prompt from story context
- `autoCleanup`: If true, deletes metadata files after successful review
- `storage.enabled`: If true, stores review results to kanban story
- `storage.storeFalsePositives`: If true, stores identified false positives to memory

---

## Built-in Reviewers

### Claude

Anthropic's official CLI for Claude.

```yaml
- name: claude
  enabled: true
  command: /Users/username/.claude/local/claude
  args:
    - "-p"
    - "___PROMPT___"
    - "--allowedTools"
    - "Bash,Read,Glob,Grep,Write"
    - "--allowedTools"
    - "mcp__cc-devtools-kanban__*,mcp__cc-devtools-memory__*"
  timeout: 900000
```

**Key Features:**
- Excellent architectural analysis
- Strong best practices recommendations
- Good at identifying maintainability issues
- Can access kanban and memory via MCP

**Setup:**
1. Install Claude CLI: [https://docs.anthropic.com/claude/docs/cli](https://docs.anthropic.com/claude/docs/cli)
2. Update `command` path to your Claude executable
3. Configure allowed tools as needed

### Codex

AI coding assistant CLI.

```yaml
- name: codex
  enabled: true
  command: codex
  args:
    - "exec"
    - "___PROMPT___"
    - "--full-auto"
  timeout: 900000
```

**Key Features:**
- Strong logic error detection
- Good at edge case identification
- Fast review completion
- Automatic mode for unattended review

**Setup:**
1. Install Codex CLI
2. Ensure `codex` is in your PATH or use full path
3. `--full-auto` enables unattended operation

### Qwen

Qwen AI assistant with security focus.

```yaml
- name: qwen
  enabled: false  # Disabled by default
  command: qwen
  args:
    - "-p"
    - "___PROMPT___"
    - "--approval-mode"
    - "yolo"
    - "--allowed-tools"
    - "read_file,search_file_content,glob,run_shell_command,write_file"
    - "--allowed-mcp-server-names"
    - "cc-devtools-kanban,cc-devtools-memory"
  timeout: 900000
```

**Key Features:**
- Security vulnerability detection
- Performance issue identification
- Resource usage analysis
- Can access kanban and memory via MCP

**Setup:**
1. Install Qwen CLI
2. Enable in config: `enabled: true`
3. Configure approval mode and allowed tools

### Gemini

Google's Gemini AI assistant.

```yaml
- name: gemini
  enabled: false  # Disabled by default
  command: gemini
  args:
    - "___PROMPT___"
    - "--yolo"
    - "--allowed-mcp-server-names"
    - "cc-devtools-kanban,cc-devtools-memory"
  timeout: 900000
```

**Key Features:**
- Code quality analysis
- Maintainability recommendations
- Documentation suggestions
- Can access kanban and memory via MCP

**Setup:**
1. Install Gemini CLI
2. Enable in config: `enabled: true`
3. Configure YOLO mode for unattended operation

---

## Adding Custom Reviewers

### Step 1: Add Reviewer to Config

Edit `cc-devtools/workflow/reviewers.yaml`:

```yaml
reviewers:
  - name: my-custom-reviewer
    enabled: true
    command: /path/to/my-reviewer
    args:
      - "--review"
      - "___PROMPT___"
      - "--format"
      - "markdown"
    timeout: 1200000  # 20 minutes
```

### Step 2: Test Reviewer

Test your reviewer manually:

```bash
# Create test prompt
echo "Review this code for issues" > test-prompt.txt

# Test reviewer command
/path/to/my-reviewer --review test-prompt.txt --format markdown
```

### Step 3: Run Review

```bash
# Run specific reviewer
npx cc-devtools workflow review my-custom-reviewer

# Or run with other reviewers
npx cc-devtools workflow review claude my-custom-reviewer
```

### Example: Adding OpenAI CLI

```yaml
- name: openai
  enabled: true
  command: openai-cli
  args:
    - "review"
    - "--prompt-file"
    - "___PROMPT___"
    - "--model"
    - "gpt-4"
    - "--no-interactive"
  timeout: 900000
```

### Example: Adding Local Script

```yaml
- name: local-linter
  enabled: true
  command: /Users/username/scripts/code-review.sh
  args:
    - "___PROMPT___"
  timeout: 300000  # 5 minutes
```

---

## Reviewer CLI Requirements

### Command-Line Interface

Your reviewer CLI must:

1. **Accept prompt as argument** - Either file path or inline string
2. **Write output to stdout** - Review results printed to stdout
3. **Exit with code 0 on success** - Non-zero exit code indicates failure
4. **Support unattended operation** - No interactive prompts

### Prompt Format

The review prompt is generated from the template at `cc-devtools/workflow/review-prompt.md`. The template is populated with story-specific information and contains comprehensive review instructions.

**Template Variables Replaced**:
- `{{storyId}}` - Story ID (e.g., "story-123")
- `{{storyTitle}}` - Story title (e.g., "Implement user authentication")
- `{{roundNumber}}` - Review round number (1, 2, 3, etc.)
- `{{gitBranch}}` - Current git branch
- `{{roundGuidance}}` - Round-specific guidance (stricter for later rounds)

**Customization**:
You can customize the review prompt template to match your project's needs. See the [Review Prompt Template documentation](./README.md#review-prompt-template-cc-devtoolsworkflowreview-promptmd) for examples and best practices.

### Output Format

Reviewers should output:

```markdown
# Review Results

## Issues Found

### Issue 1: Missing input validation
**Severity**: High
**File**: src/auth/jwt.ts:42
**Description**: JWT token is not validated before use
**Recommendation**: Add token validation

### Issue 2: Insufficient error handling
**Severity**: Medium
**File**: src/middleware/auth.ts:15
**Description**: Auth errors not properly caught
**Recommendation**: Add try-catch block

## Positive Findings
- Good test coverage
- Clear code structure
- Proper TypeScript types

## Overall Assessment
The implementation is mostly solid but needs security improvements.
```

### Tool Access (Optional)

If your reviewer CLI supports tools:

```yaml
args:
  - "___PROMPT___"
  - "--allowed-tools"
  - "read_file,search_file_content"
  - "--allowed-mcp-servers"
  - "cc-devtools-kanban"
```

This allows reviewers to:
- Read files directly
- Search code
- Access kanban data
- Access memory

---

## Timeout and Error Handling

### Setting Timeouts

**Global default:**
```yaml
defaults:
  timeout: 900000  # 15 minutes for all reviewers
```

**Per-reviewer override:**
```yaml
reviewers:
  - name: slow-reviewer
    timeout: 1800000  # 30 minutes for this reviewer
```

**Timeout recommendations:**
- Fast reviewers (linters): 5-10 minutes (300000-600000ms)
- AI reviewers: 15-20 minutes (900000-1200000ms)
- Deep analysis reviewers: 30+ minutes (1800000+ms)

### Timeout Behavior

When a reviewer times out:

1. **Process is killed** - Reviewer process is terminated
2. **Partial output is saved** - Any stdout output up to timeout is captured
3. **Marked as timed out** - Result shows `timedOut: true`
4. **Other reviewers continue** - Timeout doesn't stop other reviewers
5. **Review can still succeed** - If other reviewers complete successfully

**Example output:**
```json
{
  "reviews": [
    {
      "reviewer": "claude",
      "success": true,
      "output": "Review results..."
    },
    {
      "reviewer": "slow-reviewer",
      "success": false,
      "timedOut": true,
      "output": "Partial output before timeout..."
    }
  ]
}
```

### Error Handling

**Reviewer exits with error:**
```json
{
  "reviewer": "broken-reviewer",
  "success": false,
  "error": "Command exited with code 1",
  "output": "Error output from reviewer..."
}
```

**Command not found:**
```json
{
  "reviewer": "missing-reviewer",
  "success": false,
  "error": "Command not found: /path/to/reviewer"
}
```

**Permission denied:**
```json
{
  "reviewer": "unauthorized-reviewer",
  "success": false,
  "error": "EACCES: permission denied"
}
```

### Handling Review Failures

**Continue on failure:**
- Review orchestrator runs all enabled reviewers
- Individual failures don't stop other reviewers
- Summary shows success/failure/timeout counts

**Partial success:**
- If at least one reviewer succeeds, review is considered partially successful
- You can proceed with findings from successful reviewers
- Investigate failed reviewers separately

**Complete failure:**
- If all reviewers fail or timeout, review fails
- Check reviewer configurations
- Test reviewers manually
- Check logs: `workflow.log`

---

## Review Storage

### Storing Reviews to Kanban

When `storage.enabled: true`, reviews are stored to the story:

```yaml
review:
  storage:
    enabled: true
```

**What gets stored:**
- All reviewer outputs
- Review timestamp
- Round number (for multiple review rounds)
- Reviewer names

**Where it's stored:**
- In kanban story's `review` field
- Accessible via: `npx cc-devtools kanban get <story-id>`

**Format:**
```json
{
  "round": 1,
  "timestamp": "2025-10-16T12:34:56Z",
  "reviewers": ["claude", "codex"],
  "results": {
    "claude": "Review output from Claude...",
    "codex": "Review output from Codex..."
  }
}
```

### Storing False Positives to Memory

When `storage.storeFalsePositives: true`:

```yaml
review:
  storage:
    storeFalsePositives: true
```

**What gets stored:**
- Issues identified as false positives during review
- Helps reviewers learn from past reviews
- Reduces false positives in future reviews

**How to mark false positives:**
Use the `/start-review` command which includes cross-validation phase where you can identify false positives.

**Format in memory:**
```json
{
  "type": "false_positive",
  "issue": "Description of false positive",
  "reviewer": "claude",
  "story_id": "story-123",
  "timestamp": "2025-10-16T12:34:56Z"
}
```

### Review Metadata Files

Review metadata is stored in `.tmp/` (or configured `metadataDir`):

```
.tmp/
├── review-prompt.txt           # Generated review prompt
├── review-metadata.json        # Review metadata (story ID, round)
├── claude-review.txt           # Claude's output
├── codex-review.txt            # Codex's output
└── qwen-review.txt             # Qwen's output
```

**Metadata file format:**
```json
{
  "story_id": "story-123",
  "round_number": 1
}
```

**Cleanup:**
- Use `--cleanup` flag: `npx cc-devtools workflow review --cleanup`
- Or enable `autoCleanup: true` in config
- Metadata is automatically cleaned up on successful review

---

## Troubleshooting

### Reviewer Not Found

**Problem**: `Command not found: reviewer-name`

**Solutions:**
1. Use full path to CLI: `/usr/local/bin/reviewer-name`
2. Add CLI to PATH: `export PATH="$PATH:/path/to/cli"`
3. Verify CLI is executable: `chmod +x /path/to/cli`
4. Test manually: `/path/to/cli --version`

### Reviewer Times Out

**Problem**: Reviewer consistently times out.

**Solutions:**
1. Increase timeout: `timeout: 1800000` (30 minutes)
2. Check reviewer is running: `ps aux | grep reviewer-name`
3. Test manually with prompt: `reviewer-name < .tmp/review-prompt.txt`
4. Check for infinite loops in reviewer
5. Reduce prompt complexity
6. Disable and investigate separately

### No Output from Reviewer

**Problem**: Reviewer completes but produces no output.

**Solutions:**
1. Verify reviewer writes to stdout, not stderr
2. Check reviewer exit code: test manually and check `echo $?`
3. Enable verbose output in reviewer args
4. Check `.tmp/reviewer-name-review.txt` for partial output
5. Review workflow.log for errors

### Review Not Stored to Kanban

**Problem**: Review completes but isn't saved to story.

**Solutions:**
1. Check storage is enabled: `reviewers.yaml` → `review.storage.enabled: true`
2. Verify kanban is working: `npx cc-devtools kanban get <story-id>`
3. Check story is in review status: `status: in_review`
4. Review workflow.log for storage errors
5. Manually store review: `npx cc-devtools kanban add-review <story-id> <round> <output>`

### Prompt Not Generated

**Problem**: Review fails with "prompt file not found" or "Review prompt template not found".

**Solutions:**
1. **If template is missing**: Run `npx cc-devtools setup` to create the default template at `cc-devtools/workflow/review-prompt.md`
2. **If generated prompt is missing**: Enable auto-generate: `review.autoGenerate: true`
3. Create `.tmp/` directory: `mkdir -p .tmp`
4. Manually create prompt: save to `.tmp/review-prompt.txt`
5. Check story exists: `npx cc-devtools kanban get <story-id>`
6. Verify git branch: `git branch --show-current`
7. Check template file exists: `ls cc-devtools/workflow/review-prompt.md`

### Permission Denied

**Problem**: `EACCES: permission denied`

**Solutions:**
1. Make CLI executable: `chmod +x /path/to/cli`
2. Check file ownership: `ls -l /path/to/cli`
3. Run with correct user permissions
4. Check directory permissions for `.tmp/`

### Reviewer Conflicts with Main Process

**Problem**: Reviewer modifies files, causing git conflicts.

**Solutions:**
1. Restrict reviewer tools: Only allow read-only tools
   ```yaml
   args:
     - "--allowed-tools"
     - "read_file,search_file_content,glob"  # No write tools
   ```
2. Run reviewers in separate directory
3. Stash changes before review: `git stash`
4. Review in separate git worktree

---

## Best Practices

### 1. Start with Few Reviewers

Begin with 1-2 reviewers, add more as needed:

```yaml
reviewers:
  - name: claude
    enabled: true
  - name: codex
    enabled: false  # Add later
```

### 2. Use Full Paths

Always use full paths to avoid PATH issues:

```yaml
command: /Users/username/.claude/local/claude
```

Not:
```yaml
command: claude  # Might not be found
```

### 3. Set Reasonable Timeouts

Balance thoroughness with practical wait times:

- Quick linters: 5 min (300000)
- AI reviewers: 15 min (900000)
- Deep analysis: 30 min (1800000)

### 4. Enable Storage

Always store reviews for future reference:

```yaml
review:
  storage:
    enabled: true
```

### 5. Test Reviewers Separately

Before adding to workflow, test manually:

```bash
/path/to/reviewer --review test-prompt.txt
```

### 6. Monitor Resource Usage

Some reviewers are resource-intensive:
- Run fewer in parallel if system struggles
- Use `timeout` to prevent runaway processes
- Monitor CPU/memory during reviews

### 7. Customize Prompts

Tailor review prompts to your needs:
- Focus on specific concerns
- Include project-specific guidelines
- Reference style guides
- Mention known issues to avoid

### 8. Iterate on Configuration

Refine reviewer args based on results:
- Add/remove allowed tools
- Adjust output formats
- Configure verbosity levels
- Tune timeout values

---

## Next Steps

- [Explore advanced workflow features](./ADVANCED.md)
- [Learn about decision tree customization](./DECISION_TREE.md)
- [Return to workflow overview](./README.md)
