# Memory Tool Documentation

Persistent memory system with hybrid keyword and semantic search capabilities for Claude Code.

## Overview

The Memory tool enables Claude Code to store and retrieve project knowledge across sessions using a combination of keyword matching and semantic similarity search.

### Key Features

- **Hybrid Search** - Combines keyword matching with semantic embeddings
- **Automatic Embeddings** - Generates embeddings using local transformer model
- **Cosine Similarity** - Ranks results by semantic relevance
- **Category Organization** - Optional tagging for organization
- **Persistent Storage** - YAML-based storage with git-friendly format
- **Offline Operation** - No API calls or network required

## Storage

- **File:** `cc-devtools/memory/memory.yaml`
- **Format:** YAML with memories array
- **Created:** Automatically on first use
- **Version Control:** Should be committed to git
- **Cache:** `cc-devtools/.cache/memory-embeddings.msgpack` (gitignored, auto-regenerated, MessagePack format)

## MCP Tools

### `memory_store`

Store a new memory with optional categorization and metadata.

**Parameters:**
- `summary` (required, string) - Brief one-line summary of the memory
- `details` (required, string) - Detailed information to remember
- `tags` (optional, string[]) - Category tags for organization

**Returns:**
```json
{
  "success": true,
  "memory": {
    "id": "uuid-string",
    "summary": "Brief summary",
    "details": "Detailed information...",
    "tags": ["category1", "category2"],
    "created_at": 1696723200
  },
  "message": "Memory stored successfully"
}
```

**Example:**
```json
{
  "summary": "User prefers TypeScript with strict mode",
  "details": "All code should use TypeScript with strict type checking enabled. No 'any' types allowed. Prefer interfaces over inline types.",
  "tags": ["preferences", "typescript"]
}
```

### `memory_search`

Search memories using hybrid keyword + semantic search.

**Parameters:**
- `query` (required, string) - Search query
- `tags` (optional, string[]) - Filter by specific tags
- `limit` (optional, number) - Maximum results to return (default: 5)
- `threshold` (optional, number) - Minimum similarity score 0-1 (default: 0.0)

**Returns:**
```json
{
  "results": [
    {
      "memory": {
        "id": "uuid-string",
        "summary": "Brief summary",
        "details": "Detailed information...",
        "tags": ["category1"],
        "created_at": 1696723200
      },
      "score": 0.85,
      "matchType": "semantic"
    }
  ],
  "query": "original search query",
  "totalResults": 3
}
```

**Match Types:**
- `keyword` - Matched via keyword search
- `semantic` - Matched via embedding similarity
- `both` - Matched by both methods

## Data Schema

### Memory Object

```yaml
memories:
  - id: "550e8400-e29b-41d4-a716-446655440000"
    summary: "User prefers TypeScript with strict mode"
    details: |
      All code should use TypeScript with strict type checking enabled.
      No 'any' types allowed.
      Prefer interfaces over inline types.
      Validate all inputs at boundaries.
    tags: ["preferences", "typescript"]
    created_at: 1696723200
```

**Fields:**
- `id` - UUID identifier (auto-generated)
- `summary` - Brief one-line summary (max ~100 chars recommended)
- `details` - Detailed information, can be multi-line
- `tags` - Array of category tags (can be empty)
- `created_at` - Unix timestamp (seconds since epoch)

### Embeddings Cache

Stored separately in `cc-devtools/.cache/memory-embeddings.msgpack` (gitignored):

- **Format:** MessagePack binary format (efficient storage/fast loading)
- **Location:** `.cache/` directory (ephemeral, not committed to git)
- **Regeneration:** Automatically recreated if missing or out of sync
- **Performance:** 50-80% smaller than JSON/YAML, faster serialization
- **Dimensions:** 384-dimensional vectors (one per memory)

Embeddings are regenerated automatically if the cache is missing or out of sync.

## Search Algorithm

The hybrid search combines two approaches:

### 1. Keyword Search
- Tokenizes query and memory text
- Case-insensitive matching
- Matches words in summary, details, and tags
- Returns memories with any keyword match

### 2. Semantic Search
- Generates embedding for search query
- Compares against cached memory embeddings
- Calculates cosine similarity (0-1)
- Returns memories above threshold

### Ranking
- Results from both methods are combined
- Sorted by score (semantic similarity or keyword match count)
- Duplicates are merged with highest score
- Limited to requested number of results

## Embedding Model

Uses `Xenova/all-MiniLM-L6-v2` transformer model:
- **Dimensions:** 384
- **License:** Apache 2.0
- **Speed:** Fast, runs locally
- **Size:** ~90MB download on first use
- **Cache:** `~/.cache/huggingface/` (reused across projects)

## Configuration

No configuration file needed. Default behavior:
- **Search limit:** 5 results
- **Similarity threshold:** 0.0 (no minimum)
- **Embedding model:** Xenova/all-MiniLM-L6-v2
- **Lock timeout:** 5000ms with retries

## Best Practices

### Storing Memories
- Use clear, descriptive summaries
- Include all relevant details
- Add tags for easy filtering
- Store decisions, not just facts
- Include context and reasoning

### Writing Good Summaries
```
✅ Good: "User prefers snake_case for Python variables"
❌ Bad: "Variable naming"

✅ Good: "API authentication uses JWT tokens with 1h expiration"
❌ Bad: "Auth info"

✅ Good: "Deploy to production requires approval from @username"
❌ Bad: "Deployment process"
```

### Writing Detailed Information
```
✅ Good:
"Database migrations must be reversible.
- Always include both up() and down() methods
- Test rollback before merging
- Document breaking changes in commit message"

❌ Bad:
"Make migrations reversible"
```

### Choosing Tags
- Use consistent naming conventions
- Prefer specific over generic tags
- Common categories: `preferences`, `decisions`, `architecture`, `workflow`, `api`, `database`
- Avoid over-tagging (3-5 tags maximum)

### Search Queries
```
✅ Good: "How should I handle database migrations?"
✅ Good: "What's the authentication flow?"
✅ Good: "deployment approval process"

❌ Bad: "db" (too vague)
❌ Bad: "info" (too generic)
```

## Use Cases

### Project Preferences
```json
{
  "summary": "Code style: 2-space indents, semicolons required",
  "details": "All JavaScript/TypeScript files must use 2-space indentation with semicolons. Enforced by Prettier config.",
  "tags": ["preferences", "code-style"]
}
```

### Architecture Decisions
```json
{
  "summary": "Using PostgreSQL with TypeORM for data layer",
  "details": "Selected PostgreSQL for ACID compliance and JSON support. TypeORM chosen for type-safe migrations and entity relationships. Connection pooling configured with max 20 connections.",
  "tags": ["architecture", "database"]
}
```

### API Specifications
```json
{
  "summary": "REST API authentication uses Bearer tokens",
  "details": "All authenticated endpoints require 'Authorization: Bearer <token>' header. Tokens are JWT with 1 hour expiration. Refresh endpoint at POST /api/auth/refresh.",
  "tags": ["api", "authentication"]
}
```

### Workflow Rules
```json
{
  "summary": "Pull requests require 2 approvals before merge",
  "details": "All PRs to main branch need approval from 2 team members. One must be from senior dev. CI must pass (tests + lint). Squash and merge preferred.",
  "tags": ["workflow", "git"]
}
```

## Troubleshooting

### Search Returns No Results

**Check:**
1. Memories exist - Search for common terms or check YAML file
2. Query specificity - Try broader or more specific queries
3. Threshold too high - Lower the threshold parameter
4. Tag filters - Remove tag filters to search all memories

### Embeddings Slow to Generate

**First Use:**
- Model downloads ~90MB on first run
- Cached in `~/.cache/huggingface/` for reuse

**Performance:**
- Embedding generation is CPU-intensive
- Expect ~100-500ms per memory
- Cache is regenerated only when needed

### File Locked Error

If multiple processes try to access memory simultaneously:
1. Wait a few seconds and retry
2. Check for hung processes
3. Manually remove `cc-devtools/memory/.memory-lock` if stale

### Data File Corruption

If `memory.yaml` becomes corrupted:
1. Check YAML syntax with validator
2. Restore from git history
3. Verify required fields (id, summary, details, tags, created_at)
4. Regenerate embeddings cache (will auto-rebuild)

## Integration with Claude Code

The Memory tool enables Claude Code to:

1. **Remember Preferences** - Store user preferences for code style, patterns
2. **Track Decisions** - Record architectural and design decisions
3. **Maintain Context** - Preserve important project information across sessions
4. **Quick Recall** - Find relevant information via natural language search
5. **Learn Patterns** - Build knowledge base of project-specific patterns

## Implementation Details

See [memory_implementation.md](./memory_implementation.md) for technical details:
- Embedding generation process
- Search algorithm implementation
- File locking mechanism
- Performance characteristics

## Related Documentation

- [Implementation Details](./memory_implementation.md) - Technical deep dive
- [Main README](../../README.md) - Package documentation
- [CHANGELOG](../../CHANGELOG.md) - Version history

## Support

- **Issues:** [GitHub Issues](https://github.com/shaenchen/cc-devtools/issues)
- **Main Documentation:** [cc-devtools README](../../README.md)
