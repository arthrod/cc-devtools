# Per-File Runner Examples

Real-world examples of using the per-file runner for various tasks.

## Example 1: Add Documentation with Claude CLI

Add JSDoc comments to all TypeScript files using Claude CLI.

### Configuration

`cc-devtools/per-file-runner.yaml`:

```yaml
configs:
  - id: add-jsdoc
    name: Add JSDoc Documentation
    prompt: |
      Review the file {filename} and add comprehensive JSDoc comments to all exported functions, classes, and interfaces.

      Guidelines:
      - Use clear, concise descriptions
      - Document all parameters with @param
      - Document return values with @returns
      - Include @example for complex functions
      - Don't modify any code logic

      Follow the existing documentation style in the project.
    priority: 1
    glob:
      include:
        - "src/**/*.ts"
        - "lib/**/*.ts"
      exclude:
        - "node_modules/**"
        - "dist/**"
        - "**/*.test.ts"
        - "**/*.spec.ts"
    command: claude
    args:
      - "-p"
      - "___PROMPT___"
      - "--allowedTools"
      - "Read,Write,Edit,Glob,Grep"
    timeout: 300000
```

### Usage

```bash
# Check what files need documentation
npx cc-devtools per-file-runner status add-jsdoc

# Test on a subset first
npx cc-devtools per-file-runner run add-jsdoc --dry-run

# Run for real
npx cc-devtools per-file-runner run add-jsdoc
```

### Expected Results

Before:
```typescript
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

After:
```typescript
/**
 * Calculates the total price of all items
 *
 * @param items - Array of items to calculate total for
 * @returns Total price of all items
 *
 * @example
 * const total = calculateTotal([
 *   { name: 'Apple', price: 1.50 },
 *   { name: 'Banana', price: 0.75 }
 * ]);
 * // Returns: 2.25
 */
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

## Example 2: Multi-Stage Code Enhancement

Run multiple AI tools in sequence to enhance code quality.

### Configuration

```yaml
configs:
  # Stage 1: Add type annotations
  - id: add-types
    name: Add Type Annotations
    prompt: |
      Review {filename} and add explicit TypeScript type annotations where they are missing or could be more specific.
      Do not change any logic, only add types.
    priority: 1
    glob:
      include:
        - "src/**/*.ts"
      exclude:
        - "node_modules/**"
        - "dist/**"
    command: claude
    args:
      - "-p"
      - "___PROMPT___"
      - "--allowedTools"
      - "Read,Write,Edit"
    timeout: 300000

  # Stage 2: Generate tests (depends on types from stage 1)
  - id: generate-tests
    name: Generate Unit Tests
    prompt: |
      Review {filename} and generate comprehensive unit tests.
      Create a test file next to the source file with the same name but .test.ts extension.
      Use vitest as the testing framework.
    priority: 2
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
      - "--allowedTools"
      - "Read,Write"
    timeout: 600000

  # Stage 3: Add documentation (depends on types and tests)
  - id: add-documentation
    name: Add Documentation
    prompt: |
      Review {filename} and its corresponding test file.
      Add comprehensive JSDoc documentation to all exported items.
      Reference the tests in @example tags where appropriate.
    priority: 3
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
      - "--allowedTools"
      - "Read,Write,Edit"
    timeout: 300000
```

### Usage

```bash
# Run all stages in order
npx cc-devtools per-file-runner run-all

# Or run each stage individually
npx cc-devtools per-file-runner run add-types
npx cc-devtools per-file-runner run generate-tests
npx cc-devtools per-file-runner run add-documentation
```

## Example 3: Continuous Code Quality Monitoring

Use automatic mode to continuously ensure code quality.

### Configuration

```yaml
configs:
  - id: fix-lint-errors
    name: Fix ESLint Errors
    prompt: |
      Run ESLint on {filename} and fix any errors or warnings.
      Maintain the existing code style and logic.
      Only fix issues that ESLint reports.
    priority: 1
    glob:
      include:
        - "src/**/*.ts"
        - "src/**/*.tsx"
      exclude:
        - "node_modules/**"
        - "dist/**"
    command: claude
    args:
      - "-p"
      - "___PROMPT___"
      - "--allowedTools"
      - "Bash,Read,Write,Edit"
    timeout: 180000
```

### Usage

```bash
# Run once
npx cc-devtools per-file-runner run fix-lint-errors

# Or run continuously in the background
npx cc-devtools per-file-runner automatic

# In another terminal, continue development
# The automatic runner will detect and fix lint errors in modified files
```

## Example 4: Code Migration with Custom Script

Migrate code using a custom Node.js script.

### Migration Script

`scripts/migrate-imports.js`:

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get filename from command line
const filename = process.argv[2];

if (!filename) {
  console.error('Usage: node migrate-imports.js <filename>');
  process.exit(1);
}

try {
  // Read file
  let content = fs.readFileSync(filename, 'utf-8');

  // Perform migration
  content = content.replace(
    /import\s+\{\s*(\w+)\s*\}\s+from\s+['"]@\/utils['"];/g,
    "import { $1 } from '@/lib/utils';"
  );

  // Write back
  fs.writeFileSync(filename, content, 'utf-8');

  console.log(`Migrated: ${filename}`);
  process.exit(0);
} catch (error) {
  console.error(`Error migrating ${filename}:`, error.message);
  process.exit(1);
}
```

### Configuration

```yaml
configs:
  - id: migrate-imports
    name: Migrate Import Paths
    prompt: "{filename}"  # Just pass the filename
    priority: 1
    glob:
      include:
        - "src/**/*.ts"
        - "src/**/*.tsx"
      exclude:
        - "node_modules/**"
        - "dist/**"
    command: node
    args:
      - "scripts/migrate-imports.js"
      - "___PROMPT___"
    timeout: 30000
```

### Usage

```bash
# Check which files will be migrated
npx cc-devtools per-file-runner status migrate-imports

# Dry run to preview
npx cc-devtools per-file-runner run migrate-imports --dry-run

# Run migration
npx cc-devtools per-file-runner run migrate-imports
```

## Example 5: API Documentation Generation

Generate API documentation from code using multiple AI models.

### Configuration

```yaml
configs:
  - id: generate-api-docs-claude
    name: Generate API Docs (Claude)
    prompt: |
      Analyze the API endpoints in {filename}.
      Generate OpenAPI/Swagger documentation in YAML format.
      Save the documentation to docs/api/{filename}.yaml
    priority: 1
    glob:
      include:
        - "src/routes/**/*.ts"
      exclude:
        - "**/*.test.ts"
    command: claude
    args:
      - "-p"
      - "___PROMPT___"
      - "--allowedTools"
      - "Read,Write,Glob"
    timeout: 600000

  - id: generate-api-docs-codex
    name: Generate API Docs (Codex Verification)
    prompt: |
      Review the API documentation in docs/api/{filename}.yaml
      Verify accuracy against the source code {filename}.
      Fix any inconsistencies.
    priority: 2
    glob:
      include:
        - "src/routes/**/*.ts"
      exclude:
        - "**/*.test.ts"
    command: codex
    args:
      - "___PROMPT___"
      - "--allowed-tools"
      - "read,write"
    timeout: 600000
```

### Usage

```bash
# Generate and verify all API documentation
npx cc-devtools per-file-runner run-all
```

## Example 6: Internationalization (i18n) Key Extraction

Extract hardcoded strings and replace with i18n keys.

### Configuration

```yaml
configs:
  - id: extract-i18n
    name: Extract i18n Keys
    prompt: |
      Review {filename} and identify all user-facing strings.

      For each string:
      1. Generate a meaningful key (e.g., "error.notFound")
      2. Add the key to src/locales/en.json
      3. Replace the string in the code with t('key')

      Preserve the original functionality and maintain proper TypeScript types.
    priority: 1
    glob:
      include:
        - "src/components/**/*.tsx"
        - "src/pages/**/*.tsx"
      exclude:
        - "**/*.test.tsx"
        - "**/*.stories.tsx"
    command: claude
    args:
      - "-p"
      - "___PROMPT___"
      - "--allowedTools"
      - "Read,Write,Edit,Glob"
    timeout: 600000
```

### Before

```tsx
export function ErrorMessage({ error }: Props) {
  return (
    <div className="error">
      <h2>An error occurred</h2>
      <p>{error.message}</p>
      <button>Try again</button>
    </div>
  );
}
```

### After

```tsx
export function ErrorMessage({ error }: Props) {
  const { t } = useTranslation();

  return (
    <div className="error">
      <h2>{t('error.occurred')}</h2>
      <p>{error.message}</p>
      <button>{t('action.tryAgain')}</button>
    </div>
  );
}
```

### Usage

```bash
# Extract i18n keys from all components
npx cc-devtools per-file-runner run extract-i18n
```

## Example 7: Security Audit with AI

Automated security review of all source files.

### Configuration

```yaml
configs:
  - id: security-audit
    name: Security Audit
    prompt: |
      Perform a security audit of {filename}.

      Check for:
      - SQL injection vulnerabilities
      - XSS vulnerabilities
      - Authentication bypasses
      - Insecure data handling
      - Hardcoded secrets
      - CSRF vulnerabilities

      For each issue found:
      1. Describe the vulnerability
      2. Explain the potential impact
      3. Provide a code fix

      Store findings in security-audit/{filename}.md
    priority: 1
    glob:
      include:
        - "src/**/*.ts"
        - "src/**/*.tsx"
      exclude:
        - "node_modules/**"
        - "**/*.test.ts"
    command: claude
    args:
      - "-p"
      - "___PROMPT___"
      - "--allowedTools"
      - "Read,Write"
    timeout: 600000
```

### Usage

```bash
# Audit all files
npx cc-devtools per-file-runner run security-audit

# Review findings
ls security-audit/
cat security-audit/src/api/auth.ts.md
```

## Example 8: Dependency Update Impact Analysis

Analyze impact of dependency updates on codebase.

### Configuration

```yaml
configs:
  - id: analyze-breaking-changes
    name: Analyze Breaking Changes
    prompt: |
      Review {filename} for usage of the 'react' package.

      Based on the React 19 migration guide:
      - Identify deprecated APIs being used
      - Suggest migration paths
      - Estimate effort (low/medium/high)

      Save findings to migration-notes/{filename}.md
    priority: 1
    glob:
      include:
        - "src/**/*.tsx"
        - "src/**/*.ts"
      exclude:
        - "node_modules/**"
    command: claude
    args:
      - "-p"
      - "___PROMPT___"
      - "--allowedTools"
      - "Read,Write"
    timeout: 300000
```

### Usage

```bash
# Before upgrading dependencies
npx cc-devtools per-file-runner run analyze-breaking-changes

# Review all migration notes
find migration-notes -name "*.md" -exec cat {} \;
```

## Example 9: Code Style Consistency

Ensure consistent code patterns across the codebase.

### Configuration

```yaml
configs:
  - id: enforce-patterns
    name: Enforce Code Patterns
    prompt: |
      Review {filename} and enforce these patterns:

      1. All API calls must use the custom useApi hook
      2. All forms must use react-hook-form
      3. All modals must use the Modal component from ui/
      4. All dates must use date-fns for formatting

      Refactor code to follow these patterns while maintaining functionality.
    priority: 1
    glob:
      include:
        - "src/features/**/*.tsx"
      exclude:
        - "**/*.test.tsx"
    command: claude
    args:
      - "-p"
      - "___PROMPT___"
      - "--allowedTools"
      - "Read,Write,Edit,Glob"
    timeout: 600000
```

## Example 10: Performance Optimization

Automated performance optimization suggestions.

### Configuration

```yaml
configs:
  - id: optimize-performance
    name: Optimize Performance
    prompt: |
      Analyze {filename} for performance optimization opportunities.

      Check for:
      - Unnecessary re-renders
      - Missing React.memo
      - Large bundle sizes (unused imports)
      - Inefficient algorithms
      - Missing useMemo/useCallback

      For each optimization:
      1. Explain the issue
      2. Provide optimized code
      3. Estimate performance impact

      Save findings to performance/{filename}.md
    priority: 1
    glob:
      include:
        - "src/components/**/*.tsx"
        - "src/pages/**/*.tsx"
      exclude:
        - "**/*.test.tsx"
    command: claude
    args:
      - "-p"
      - "___PROMPT___"
      - "--allowedTools"
      - "Read,Write"
    timeout: 600000
```

## Tips for Effective Prompts

### 1. Be Specific

**Bad:**
```yaml
prompt: "Improve {filename}"
```

**Good:**
```yaml
prompt: |
  Review {filename} and:
  1. Add error handling to all async functions
  2. Add loading states to all data fetching
  3. Add input validation to all forms
```

### 2. Provide Context

**Bad:**
```yaml
prompt: "Add tests for {filename}"
```

**Good:**
```yaml
prompt: |
  Generate unit tests for {filename} using vitest.
  Follow the testing patterns in the project:
  - Use describe/it blocks
  - Mock external dependencies
  - Test edge cases and error paths
  - Aim for 80%+ coverage
```

### 3. Set Constraints

**Good:**
```yaml
prompt: |
  Refactor {filename} to use TypeScript.

  Constraints:
  - Do not change function signatures
  - Do not modify exported APIs
  - Maintain backward compatibility
  - Use strict TypeScript settings
```

### 4. Include Examples

**Good:**
```yaml
prompt: |
  Add JSDoc to {filename}.

  Example style:
  /**
   * Brief description
   *
   * @param name - Parameter description
   * @returns Return value description
   * @throws {Error} When something goes wrong
   */
```

### 5. Specify Output Format

**Good:**
```yaml
prompt: |
  Analyze {filename} and save findings to analysis/{filename}.md

  Use this format:
  ## Issues Found
  - [CRITICAL] Description
  - [WARNING] Description

  ## Recommendations
  1. Fix description
  2. Improvement description
```

## Best Practices from Real Projects

### Start Small

```bash
# Test on 1-2 files first
- id: test-run
  glob:
    include: ["src/utils/helpers.ts"]
```

### Use Dry Run

```bash
npx cc-devtools per-file-runner run test-run --dry-run
```

### Commit Before Running

```bash
git commit -am "Before per-file-runner"
npx cc-devtools per-file-runner run add-docs
git diff  # Review ALL changes
```

### Review Generated Code

Never blindly accept AI-generated code:
1. Review each file changed
2. Run tests: `npm test`
3. Run linter: `npm run lint`
4. Run type checker: `npm run typecheck`

### Handle Failures Gracefully

```bash
# If command fails on file 10 of 100
# Fix the issue, then run again
# It will resume from file 10
npx cc-devtools per-file-runner run add-docs
```

## Common Pitfalls

### 1. Too Broad Globs

**Problem:** Processing too many files at once

**Solution:** Start with specific directories
```yaml
# Instead of
include: ["**/*.ts"]

# Use
include: ["src/utils/**/*.ts"]
```

### 2. Timeout Too Short

**Problem:** Commands timing out

**Solution:** Increase timeout for complex operations
```yaml
timeout: 600000  # 10 minutes for complex AI processing
```

### 3. Ignoring Failures

**Problem:** Continuing despite errors

**Solution:** The runner stops on errors intentionally - fix them

### 4. Not Using Version Control

**Problem:** Can't revert unwanted changes

**Solution:** Always commit before running

### 5. Prompt Too Vague

**Problem:** Inconsistent or incorrect results

**Solution:** Make prompts specific with examples
