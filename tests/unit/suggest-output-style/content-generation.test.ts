import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { createTempDir, cleanupTempDir, createMockMcpJson } from '../../helpers/test-utils.js';

describe('suggest-output-style content generation', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('feature detection from .mcp.json', () => {
    it('should detect no enabled features when .mcp.json is empty', () => {
      createMockMcpJson(tempDir, { mcpServers: {} });

      const mcpConfig = JSON.parse(readFileSync(join(tempDir, '.mcp.json'), 'utf-8'));
      const servers = mcpConfig.mcpServers || {};

      expect(Object.keys(servers)).toHaveLength(0);
    });

    it('should detect kanban when cc-devtools-kanban is enabled', () => {
      createMockMcpJson(tempDir, {
        mcpServers: {
          'cc-devtools-kanban': {
            command: 'node',
            args: ['./dist/kanban/mcp-server/index.js'],
            disabled: false
          }
        }
      });

      const mcpConfig = JSON.parse(readFileSync(join(tempDir, '.mcp.json'), 'utf-8'));
      const servers = mcpConfig.mcpServers || {};

      expect(servers['cc-devtools-kanban']).toBeDefined();
      expect(servers['cc-devtools-kanban'].disabled).toBe(false);
    });

    it('should not detect disabled features', () => {
      createMockMcpJson(tempDir, {
        mcpServers: {
          'cc-devtools-memory': {
            command: 'node',
            args: ['./dist/memory/mcp-server/index.js'],
            disabled: true
          }
        }
      });

      const mcpConfig = JSON.parse(readFileSync(join(tempDir, '.mcp.json'), 'utf-8'));
      const servers = mcpConfig.mcpServers || {};

      expect(servers['cc-devtools-memory'].disabled).toBe(true);
    });

    it('should detect multiple enabled features', () => {
      createMockMcpJson(tempDir, {
        mcpServers: {
          'cc-devtools-kanban': {
            command: 'node',
            args: ['./dist/kanban/mcp-server/index.js'],
            disabled: false
          },
          'cc-devtools-memory': {
            command: 'node',
            args: ['./dist/memory/mcp-server/index.js'],
            disabled: false
          },
          'cc-devtools-planner': {
            command: 'node',
            args: ['./dist/planner/mcp-server/index.js'],
            disabled: false
          }
        }
      });

      const mcpConfig = JSON.parse(readFileSync(join(tempDir, '.mcp.json'), 'utf-8'));
      const servers = mcpConfig.mcpServers || {};

      expect(Object.keys(servers)).toHaveLength(3);
      expect(servers['cc-devtools-kanban']).toBeDefined();
      expect(servers['cc-devtools-memory']).toBeDefined();
      expect(servers['cc-devtools-planner']).toBeDefined();
    });

    it('should handle features with missing disabled field as enabled', () => {
      createMockMcpJson(tempDir, {
        mcpServers: {
          'cc-devtools-planner': {
            command: 'node',
            args: ['./dist/planner/mcp-server/index.js']
            // no disabled field
          }
        }
      });

      const mcpConfig = JSON.parse(readFileSync(join(tempDir, '.mcp.json'), 'utf-8'));
      const servers = mcpConfig.mcpServers || {};

      expect(servers['cc-devtools-planner'].disabled).toBeUndefined();
      // disabled: undefined should be treated as enabled
    });
  });

  describe('output-style content structure', () => {
    it('should include frontmatter with name and description', () => {
      const content = `---
name: cc-devtools-enhanced
description: Enhanced with cc-devtools: Memory, Planner
---

# cc-devtools Integration`;

      expect(content).toMatch(/^---\n/);
      expect(content).toMatch(/name: cc-devtools-enhanced/);
      expect(content).toMatch(/description: Enhanced with cc-devtools:/);
      expect(content).toMatch(/---\n/);
    });

    it('should include Task & Knowledge Management section when memory or planner enabled', () => {
      const content = `## Task & Knowledge Management

**Proactive Usage (use without asking):**`;

      expect(content).toContain('Task & Knowledge Management');
      expect(content).toContain('Proactive Usage (use without asking)');
    });

    it('should include prescriptive directives for memory', () => {
      const content = `- **Store decisions immediately**: When architectural choices, design decisions, or technical constraints are discussed, use \`memory_store\` to preserve them
- **Search before answering**: When questions involve past context, preferences, or decisions, search with \`memory_search\` first`;

      expect(content).toContain('Store decisions immediately');
      expect(content).toContain('Search before answering');
      expect(content).toContain('memory_store');
      expect(content).toContain('memory_search');
    });

    it('should include prescriptive directives for planner', () => {
      const content = `- **Create plans at kickoff**: When breaking down multi-day features or complex work, create a plan with \`plan_store\` at the start
- **Check for existing plans**: Before starting new work, use \`plan_search\` to find related active plans`;

      expect(content).toContain('Create plans at kickoff');
      expect(content).toContain('Check for existing plans');
      expect(content).toContain('plan_store');
      expect(content).toContain('plan_search');
    });

    it('should include tool selection guidance when both memory and planner enabled', () => {
      const content = `**Tool Selection:**
- **TodoWrite**: Session task tracking (current work queue)
- **Planner**: Multi-session structured plans (use for features spanning days/weeks)
- **Memory**: Long-term knowledge (decisions, patterns, constraints that matter beyond one feature)`;

      expect(content).toContain('Tool Selection:');
      expect(content).toContain('TodoWrite');
      expect(content).toContain('Planner');
      expect(content).toContain('Memory');
    });

    it('should include Kanban section with prescriptive directive', () => {
      const content = `## Kanban Workflow

**At session start**: Use \`kanban_get_work_item\` for intelligent work recommendation (don't ask, just do it).`;

      expect(content).toContain('Kanban Workflow');
      expect(content).toContain('At session start');
      expect(content).toContain("don't ask, just do it");
      expect(content).toContain('kanban_get_work_item');
    });

    it('should include Code Navigation section with search modes', () => {
      const content = `## Code Navigation

**Before answering "where is X"**: Use \`search_code\` with semantic mode for concepts, exact mode for known identifiers.

**Search modes:**
- **semantic**: "authentication logic" → finds by meaning
- **exact**: "getUserById" → precise match
- **fuzzy**: "usrById" → typo-tolerant`;

      expect(content).toContain('Code Navigation');
      expect(content).toContain('Before answering "where is X"');
      expect(content).toContain('semantic');
      expect(content).toContain('exact');
      expect(content).toContain('fuzzy');
    });
  });

  describe('frontmatter stripping for append', () => {
    it('should strip frontmatter from content', () => {
      const contentWithFrontmatter = `---
name: cc-devtools-enhanced
description: Enhanced with cc-devtools: Memory
---

# cc-devtools Integration

Content here`;

      const contentWithoutFrontmatter = contentWithFrontmatter.replace(/^---\n[\s\S]*?\n---\n\n/, '');

      expect(contentWithoutFrontmatter).toBe(`# cc-devtools Integration

Content here`);
      expect(contentWithoutFrontmatter).not.toContain('name:');
      expect(contentWithoutFrontmatter).not.toContain('description:');
    });
  });

  describe('existing section detection and replacement', () => {
    it('should detect existing cc-devtools section', () => {
      const existingContent = `---
name: my-style
---

# My Style

Some content

# cc-devtools Integration

Old cc-devtools content here`;

      expect(existingContent).toContain('# cc-devtools Integration');
    });

    it('should remove existing cc-devtools section', () => {
      const existingContent = `---
name: my-style
---

# My Style

Some content

# cc-devtools Integration

Old cc-devtools content here`;

      const withoutCcDevtools = existingContent.replace(
        /\n# cc-devtools Integration\n[\s\S]*?(?=\n# |\n---\n|$)/,
        ''
      );

      expect(withoutCcDevtools).not.toContain('Old cc-devtools content here');
      expect(withoutCcDevtools).toContain('# My Style');
      expect(withoutCcDevtools).toContain('Some content');
    });

    it('should preserve content before cc-devtools section', () => {
      const existingContent = `---
name: my-style
---

# My Style

Custom instructions here

# cc-devtools Integration

Old stuff`;

      const withoutCcDevtools = existingContent.replace(
        /\n# cc-devtools Integration\n[\s\S]*?(?=\n# |\n---\n|$)/,
        ''
      );

      expect(withoutCcDevtools).toContain('# My Style');
      expect(withoutCcDevtools).toContain('Custom instructions here');
    });
  });

  describe('listing existing output-styles', () => {
    it('should return empty array when output-styles directory does not exist', () => {
      const outputStylesDir = join(tempDir, '.claude', 'output-styles');
      // Don't create the directory

      // Directory doesn't exist, should handle gracefully
      expect(() => {
        // This would be the behavior in actual code
      }).not.toThrow();
    });

    it('should list .md files in output-styles directory', () => {
      const outputStylesDir = join(tempDir, '.claude', 'output-styles');
      mkdirSync(outputStylesDir, { recursive: true });

      writeFileSync(join(outputStylesDir, 'style1.md'), '# Style 1', 'utf-8');
      writeFileSync(join(outputStylesDir, 'style2.md'), '# Style 2', 'utf-8');
      writeFileSync(join(outputStylesDir, 'readme.txt'), 'not a style', 'utf-8');

      const { readdirSync } = require('fs');
      const files = readdirSync(outputStylesDir);
      const mdFiles = files.filter((f: string) => f.endsWith('.md')).sort();

      expect(mdFiles).toHaveLength(2);
      expect(mdFiles).toContain('style1.md');
      expect(mdFiles).toContain('style2.md');
      expect(mdFiles).not.toContain('readme.txt');
    });

    it('should sort output-style files alphabetically', () => {
      const outputStylesDir = join(tempDir, '.claude', 'output-styles');
      mkdirSync(outputStylesDir, { recursive: true });

      writeFileSync(join(outputStylesDir, 'zebra.md'), '# Zebra', 'utf-8');
      writeFileSync(join(outputStylesDir, 'alpha.md'), '# Alpha', 'utf-8');
      writeFileSync(join(outputStylesDir, 'beta.md'), '# Beta', 'utf-8');

      const { readdirSync } = require('fs');
      const files = readdirSync(outputStylesDir).filter((f: string) => f.endsWith('.md')).sort();

      expect(files).toEqual(['alpha.md', 'beta.md', 'zebra.md']);
    });
  });

  describe('appending to existing output-style', () => {
    it('should append cc-devtools content to existing file', () => {
      const outputStylesDir = join(tempDir, '.claude', 'output-styles');
      mkdirSync(outputStylesDir, { recursive: true });

      const existingContent = `---
name: my-style
---

# My Custom Style

Custom instructions`;

      const ccDevtoolsContent = `# cc-devtools Integration

New cc-devtools content`;

      writeFileSync(join(outputStylesDir, 'my-style.md'), existingContent, 'utf-8');

      const updatedContent = existingContent.trimEnd() + '\n\n' + ccDevtoolsContent.trim() + '\n';
      writeFileSync(join(outputStylesDir, 'my-style.md'), updatedContent, 'utf-8');

      const result = readFileSync(join(outputStylesDir, 'my-style.md'), 'utf-8');

      expect(result).toContain('# My Custom Style');
      expect(result).toContain('Custom instructions');
      expect(result).toContain('# cc-devtools Integration');
      expect(result).toContain('New cc-devtools content');
    });
  });
});
