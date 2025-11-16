# Advanced Workflow Topics

This document covers advanced workflow customization, integration with other tools, debugging techniques, and log file interpretation.

## Table of Contents

- [Advanced Customization](#advanced-customization)
- [Tool Integration](#tool-integration)
- [Custom State Variables](#custom-state-variables)
- [Workflow State Debugging](#workflow-state-debugging)
- [Log File Interpretation](#log-file-interpretation)
- [Performance Optimization](#performance-optimization)
- [Multi-Project Workflows](#multi-project-workflows)
- [CI/CD Integration](#cicd-integration)
- [Advanced Review Patterns](#advanced-review-patterns)

---

## Advanced Customization

### Custom Decision Tree Logic

#### Multi-Branch Workflows

Support multiple long-lived branches (main, develop, staging):

```yaml
# cc-devtools/workflow/decision-tree.yaml
decisions:
  - name: check_target_branch
    condition: "{{git_branch}} === 'develop' || {{git_branch}} === 'staging' || {{git_branch}} === 'main'"
    if_true: on_base_branch
    if_false: on_feature_branch

  - name: on_base_branch
    condition: "{{git_branch}} === 'develop'"
    if_true: develop_branch_workflow
    if_false: check_staging_or_main

  - name: check_staging_or_main
    condition: "{{git_branch}} === 'staging'"
    if_true: staging_branch_workflow
    if_false: main_branch_workflow
```

#### Release Branch Management

Add release branch support:

```yaml
- name: check_release_branch
  condition: "{{git_branch}}.startsWith('release/')"
  if_true: on_release_branch
  if_false: continue_normal_flow

- name: on_release_branch
  condition: "{{current_story_status}} === 'done'"
  if_true:
    state: ready_to_merge_to_main
    action_type: options
    options:
      - option: Merge to Main
        description: "Merge release branch to main"
        actionNecessary: "git checkout main && git merge {{git_branch}}"
      - option: Continue Testing
        description: "Keep testing on release branch"
        actionNecessary: "Continue testing"
```

#### Hotfix Workflow

Support hotfix branches that go directly to main:

```yaml
- name: check_hotfix_branch
  condition: "{{git_branch}}.startsWith('hotfix/')"
  if_true: on_hotfix_branch
  if_false: normal_flow

- name: on_hotfix_branch
  condition: "{{current_story_status}} === 'done'"
  if_true:
    state: ready_to_deploy_hotfix
    action_type: action
    action: "Merge hotfix to main immediately: git checkout main && git merge {{git_branch}}"
```

### Custom Workflow States

#### Add Deployment States

Track deployment status in workflow:

```yaml
- name: check_deployment
  condition: "{{deployed_to_staging}} === true"
  if_true:
    state: deployed_to_staging
    action_type: options
    options:
      - option: Deploy to Production
        description: "Promote to production"
        actionNecessary: "npm run deploy:production"
      - option: Continue Testing
        description: "Test more on staging"
        actionNecessary: "Continue testing"
```

**Note**: Requires extending state reader to add `deployed_to_staging` variable.

#### Add Quality Gates

Enforce quality checks before progressing:

```yaml
- name: check_quality_gates
  condition: "{{tests_passing}} === true && {{coverage}} >= 80 && {{linting_errors}} === 0"
  if_true: quality_gates_pass
  if_false:
    state: quality_gates_failed
    action_type: error
    action: "Quality gates failed - fix issues before review"
    warning: "Tests: {{tests_passing}}, Coverage: {{coverage}}%, Lint errors: {{linting_errors}}"
```

#### Add Documentation Requirements

Require documentation updates:

```yaml
- name: check_docs_updated
  condition: "{{modified_files}}.includes('README.md') || {{modified_files}}.includes('CHANGELOG.md')"
  if_true: docs_updated
  if_false:
    state: docs_not_updated
    action_type: suggest
    action: "Consider updating README.md or CHANGELOG.md"
    warning: "Documentation updates recommended for this story"
```

---

## Tool Integration

### Git Hooks Integration

#### Pre-commit Hook

Run workflow check before commits:

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run workflow check
OUTPUT=$(npx cc-devtools workflow check 2>&1)
STATE=$(echo "$OUTPUT" | jq -r '.state')

# Block commit if in error state
if echo "$STATE" | grep -q "error"; then
  echo "Workflow error: cannot commit"
  echo "$OUTPUT" | jq .
  exit 1
fi

echo "Workflow check passed"
exit 0
```

#### Pre-push Hook

Ensure review is complete before push:

```bash
#!/bin/bash
# .git/hooks/pre-push

# Check current story status
STORY_ID=$(git branch --show-current | sed 's/feature\///')
STATUS=$(npx cc-devtools kanban get "$STORY_ID" | jq -r '.status')

# Block push if not reviewed
if [ "$STATUS" = "in_progress" ]; then
  echo "Error: Story not reviewed. Run review before push."
  exit 1
fi

exit 0
```

### npm Scripts Integration

Add workflow commands to `package.json`:

```json
{
  "scripts": {
    "workflow": "cc-devtools workflow check",
    "review": "cc-devtools workflow review",
    "start-work": "npm run workflow && git checkout -b",
    "finish-work": "npm run review && npm run workflow",
    "dev": "npm run workflow && npm start"
  }
}
```

### Editor Integration

#### VSCode Task

Add workflow check as VSCode task:

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Workflow Check",
      "type": "shell",
      "command": "npx cc-devtools workflow check --pretty",
      "group": {
        "kind": "build",
        "isDefault": false
      },
      "presentation": {
        "reveal": "always",
        "panel": "new"
      },
      "problemMatcher": []
    },
    {
      "label": "Automated Review",
      "type": "shell",
      "command": "npx cc-devtools workflow review",
      "group": {
        "kind": "test",
        "isDefault": false
      },
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    }
  ]
}
```

#### VSCode Keybindings

Add keyboard shortcuts:

```json
// .vscode/keybindings.json
[
  {
    "key": "cmd+shift+w",
    "command": "workbench.action.tasks.runTask",
    "args": "Workflow Check"
  },
  {
    "key": "cmd+shift+r",
    "command": "workbench.action.tasks.runTask",
    "args": "Automated Review"
  }
]
```

### Continuous Integration

#### GitHub Actions

Run workflow check in CI:

```yaml
# .github/workflows/workflow-check.yml
name: Workflow Check

on: [push, pull_request]

jobs:
  workflow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run workflow check
        run: npx cc-devtools workflow check --pretty
```

#### GitLab CI

```yaml
# .gitlab-ci.yml
workflow-check:
  stage: test
  script:
    - npm install
    - npx cc-devtools workflow check --pretty
  only:
    - branches
```

---

## Custom State Variables

### Extending State Reader

Add custom state variables by modifying `src/workflow/lib/state-reader.ts`:

```typescript
// Add to StateVariables interface in types/workflow.ts
export interface StateVariables {
  // ... existing variables ...

  // Custom variables
  tests_passing?: boolean;
  coverage?: number;
  linting_errors?: number;
  deployed_to_staging?: boolean;
}

// Add to readWorkflowState() in state-reader.ts
export async function readWorkflowState(): Promise<StateVariables> {
  const gitState = await readGitState();
  const kanbanState = await readKanbanState();

  // Custom state reading
  const testsPass = await runTests();
  const coveragePercent = await getCoverage();
  const lintErrors = await getLintErrors();
  const isDeployed = await checkDeployment();

  return {
    ...gitState,
    ...kanbanState,
    // Custom variables
    tests_passing: testsPass,
    coverage: coveragePercent,
    linting_errors: lintErrors,
    deployed_to_staging: isDeployed,
  };
}

// Helper functions
async function runTests(): Promise<boolean> {
  try {
    execSync('npm test', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function getCoverage(): Promise<number> {
  try {
    const output = execSync('npm run coverage:json', { encoding: 'utf-8' });
    const coverage = JSON.parse(output);
    return coverage.total.lines.pct ?? 0;
  } catch {
    return 0;
  }
}

async function getLintErrors(): Promise<number> {
  try {
    execSync('npm run lint', { stdio: 'ignore' });
    return 0;
  } catch (error) {
    // Parse eslint output to count errors
    const output = error.stdout?.toString() ?? '';
    const matches = output.match(/(\d+) errors?/);
    return matches ? parseInt(matches[1]) : 0;
  }
}

async function checkDeployment(): Promise<boolean> {
  // Check if current commit is deployed to staging
  try {
    const currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    const stagingCommit = execSync('git ls-remote origin staging', { encoding: 'utf-8' }).trim();
    return stagingCommit.includes(currentCommit);
  } catch {
    return false;
  }
}
```

### Using Custom Variables

After adding custom variables, use them in decision tree:

```yaml
- name: check_tests
  condition: "{{tests_passing}} === true"
  if_true: tests_pass
  if_false: tests_fail

- name: check_coverage
  condition: "{{coverage}} >= 80"
  if_true: coverage_sufficient
  if_false:
    state: insufficient_coverage
    action_type: error
    action: "Code coverage is {{coverage}}% - need 80% minimum"
```

---

## Workflow State Debugging

### Enable Debug Logging

Edit `cc-devtools/workflow/config.yaml`:

```yaml
logging:
  enabled: true
  level: debug  # info | debug | error
  file: workflow.log
```

### Debug Output Format

Debug logs show:

```
[DEBUG] Starting workflow check
[DEBUG] Reading git state...
[DEBUG] Git state: {"branch":"main","clean":true,...}
[DEBUG] Reading kanban state...
[DEBUG] Kanban state: {"current_story":{"id":"story-1",...},...}
[DEBUG] Evaluating decision tree...
[DEBUG] Node: root
[DEBUG] Condition: {{git_clean}} === true
[DEBUG] Evaluated: true === true
[DEBUG] Result: true
[DEBUG] Following if_true branch to: check_branch
[DEBUG] Node: check_branch
[DEBUG] Condition: {{git_branch}} === 'main'
[DEBUG] Evaluated: 'main' === 'main'
[DEBUG] Result: true
[DEBUG] Terminal state reached: on_main_branch
[DEBUG] State: on_main_branch
[DEBUG] Action type: options
[DEBUG] Options: [...]
```

### Interactive Debugging

Use Node.js to debug state reading:

```javascript
// debug-workflow.js
const { readWorkflowState } = require('./dist/workflow/lib/state-reader');

(async () => {
  const state = await readWorkflowState();
  console.log('Full state:', JSON.stringify(state, null, 2));

  // Check specific variables
  console.log('Git branch:', state.git_branch);
  console.log('Git clean:', state.git_clean);
  console.log('Current story:', state.current_story);
  console.log('Stories in progress:', state.stories_in_progress);
})();
```

Run:
```bash
node debug-workflow.js
```

### Validate Decision Tree

Test decision tree parsing:

```javascript
// validate-tree.js
const yaml = require('js-yaml');
const fs = require('fs');

const tree = yaml.load(fs.readFileSync('cc-devtools/workflow/decision-tree.yaml', 'utf8'));

// Validate structure
console.log('Decisions:', tree.decisions.length);
tree.decisions.forEach(node => {
  console.log(`- ${node.name}`);
  console.log(`  Condition: ${node.condition}`);
  console.log(`  if_true: ${typeof node.if_true === 'string' ? node.if_true : 'terminal'}`);
  console.log(`  if_false: ${typeof node.if_false === 'string' ? node.if_false : 'terminal'}`);
});
```

---

## Log File Interpretation

### Log Levels

**INFO**: Normal operations
```
[INFO] Starting workflow check
[INFO] Workflow state: ready_to_start_work
[INFO] Action: Start next todo story
```

**DEBUG**: Detailed execution trace
```
[DEBUG] Evaluating condition: {{git_clean}} === true
[DEBUG] Variable substitution: true === true
[DEBUG] Result: true
```

**ERROR**: Problems and failures
```
[ERROR] Failed to read git state: Not a git repository
[ERROR] Decision tree evaluation failed: Invalid condition syntax
[ERROR] Kanban integration error: Story not found
```

### Common Log Patterns

#### Successful Workflow Check

```
[INFO] Starting workflow check
[DEBUG] Reading git state...
[DEBUG] Git state: {...}
[DEBUG] Reading kanban state...
[DEBUG] Kanban state: {...}
[DEBUG] Evaluating decision tree...
[DEBUG] Terminal state: ready_to_start_work
[INFO] Workflow check complete
```

#### Failed State Reading

```
[INFO] Starting workflow check
[DEBUG] Reading git state...
[ERROR] Git command failed: fatal: not a git repository
[ERROR] Workflow check failed: Cannot read git state
```

#### Decision Tree Error

```
[INFO] Starting workflow check
[DEBUG] Evaluating decision tree...
[DEBUG] Node: check_branch
[ERROR] Condition evaluation failed: Syntax error in condition
[ERROR] Workflow check failed: Decision tree error
```

### Analyzing Decision Paths

To understand why workflow chose a specific path:

1. Find `[DEBUG] Node:` lines - shows which nodes were evaluated
2. Find `[DEBUG] Condition:` - shows the condition tested
3. Find `[DEBUG] Result:` - shows if condition was true/false
4. Follow the path from root to terminal state

**Example:**
```
[DEBUG] Node: root
[DEBUG] Condition: {{git_clean}} === true
[DEBUG] Result: true
[DEBUG] Following if_true to: check_branch

[DEBUG] Node: check_branch
[DEBUG] Condition: {{git_branch}} === 'main'
[DEBUG] Result: false
[DEBUG] Following if_false to: on_feature_branch

[DEBUG] Node: on_feature_branch
[DEBUG] Terminal state reached: continue_implementing
```

Path: root → check_branch → on_feature_branch

---

## Performance Optimization

### Caching State

Cache state reading for multiple checks:

```typescript
// cache-state.ts
let stateCache: { state: StateVariables; timestamp: number } | null = null;
const CACHE_TTL = 5000; // 5 seconds

export async function getCachedState(): Promise<StateVariables> {
  const now = Date.now();

  if (stateCache && (now - stateCache.timestamp) < CACHE_TTL) {
    return stateCache.state;
  }

  const state = await readWorkflowState();
  stateCache = { state, timestamp: now };
  return state;
}
```

### Parallel State Reading

Read git and kanban state in parallel:

```typescript
export async function readWorkflowState(): Promise<StateVariables> {
  // Run in parallel
  const [gitState, kanbanState] = await Promise.all([
    readGitState(),
    readKanbanState(),
  ]);

  return {
    ...gitState,
    ...kanbanState,
  };
}
```

### Lazy Loading

Only read state when needed:

```typescript
export async function readWorkflowState(options?: { skipGit?: boolean; skipKanban?: boolean }): Promise<Partial<StateVariables>> {
  const state: Partial<StateVariables> = {};

  if (!options?.skipGit) {
    Object.assign(state, await readGitState());
  }

  if (!options?.skipKanban) {
    Object.assign(state, await readKanbanState());
  }

  return state;
}
```

### Optimize Reviewer Execution

Run reviewers in batches to limit resource usage:

```typescript
// Run 2 reviewers at a time instead of all in parallel
const CONCURRENT_REVIEWERS = 2;

async function runReviewersInBatches(reviewers: ReviewerConfig[]): Promise<ReviewerResult[]> {
  const results: ReviewerResult[] = [];

  for (let i = 0; i < reviewers.length; i += CONCURRENT_REVIEWERS) {
    const batch = reviewers.slice(i, i + CONCURRENT_REVIEWERS);
    const batchResults = await Promise.all(
      batch.map(reviewer => runReviewer(reviewer))
    );
    results.push(...batchResults);
  }

  return results;
}
```

---

## Multi-Project Workflows

### Shared Configuration

Share workflow config across projects:

```yaml
# ~/workflow-templates/standard-workflow.yaml
# Shared decision tree for all projects
decisions:
  - name: root
    # ... standard workflow ...
```

Use in projects:
```yaml
# project1/cc-devtools/workflow/config.yaml
decisionTree:
  source: file
  path: ~/workflow-templates/standard-workflow.yaml
```

### Project-Specific Overrides

Extend shared config with project-specific nodes:

```yaml
# project1/cc-devtools/workflow/decision-tree.yaml
# Import shared config, add project-specific nodes
decisions:
  - name: root
    condition: "{{git_clean}} === true"
    if_true: check_project_specific
    if_false: handle_dirty_state

  # Project-specific decision
  - name: check_project_specific
    condition: "{{has_database_migrations}} === true"
    if_true: run_migrations
    if_false: continue_standard_flow
```

### Monorepo Support

Handle multiple packages in monorepo:

```yaml
- name: check_changed_packages
  condition: "{{changed_packages}}.length === 1"
  if_true: single_package_changed
  if_false: multiple_packages_changed

- name: single_package_changed
  condition: "{{current_package}} !== null"
  if_true:
    state: continue_single_package
    action_type: suggest
    action: "Continue work on package: {{current_package}}"

- name: multiple_packages_changed
  condition: "{{changed_packages}}.length > 1"
  if_true:
    state: multiple_packages
    action_type: error
    action: "Multiple packages changed - commit separately"
    warning: "Changed packages: {{changed_packages}}"
```

**Note**: Requires extending state reader to detect changed packages.

---

## CI/CD Integration

### Automated Reviews in CI

Run reviews automatically on pull requests:

```yaml
# .github/workflows/review.yml
name: Automated Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run automated review
        run: npx cc-devtools workflow review claude
        env:
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}

      - name: Post review results
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const review = fs.readFileSync('.tmp/claude-review.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Automated Review Results\n\n${review}`
            });
```

### Deployment Gates

Block deployments if workflow not complete:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  check-workflow:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check workflow state
        run: |
          STATE=$(npx cc-devtools workflow check | jq -r '.state')
          if [ "$STATE" != "ready_to_deploy" ]; then
            echo "Workflow not ready for deployment"
            exit 1
          fi
```

---

## Advanced Review Patterns

### Two-Phase Review

Run fast reviewers first, then deep analysis:

```bash
# Phase 1: Fast linting and static analysis
npx cc-devtools workflow review eslint typescript

# If phase 1 passes, run phase 2
npx cc-devtools workflow review claude codex
```

### Focused Reviews

Review specific file types only:

```yaml
# reviewers.yaml - focused reviewer
- name: typescript-reviewer
  enabled: true
  command: /path/to/reviewer
  args:
    - "___PROMPT___"
    - "--focus"
    - "*.ts,*.tsx"
```

### Incremental Reviews

Review only changed lines:

```yaml
- name: incremental-reviewer
  enabled: true
  command: /path/to/reviewer
  args:
    - "___PROMPT___"
    - "--git-diff"
    - "main...HEAD"
```

### Cross-Project Review

Review against other project patterns:

```yaml
- name: pattern-matcher
  enabled: true
  command: /path/to/reviewer
  args:
    - "___PROMPT___"
    - "--compare-with"
    - "/path/to/other/projects"
    - "--check-consistency"
```

---

## Next Steps

- [Configure custom reviewers](./REVIEWERS.md)
- [Learn about decision tree customization](./DECISION_TREE.md)
- [Return to workflow overview](./README.md)
