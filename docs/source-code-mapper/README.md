# Source Code Mapper Tool Documentation

Semantic code indexing and search system with import graph tracking for Claude Code.

## Overview

The Source Code Mapper tool indexes your codebase and provides powerful search capabilities with three modes: exact, fuzzy, and semantic. It also tracks import relationships for dependency analysis.

### Key Features

- **Works Out-of-the-Box** - Comprehensive regex parsing for 30+ languages (no installation needed)
- **Three Search Modes** - Exact, fuzzy, and semantic symbol search
- **Import Graph** - Track and query import relationships
- **File Watching** - Automatic index updates on file changes
- **Symbol Extraction** - Functions, classes, interfaces, types, variables, methods, enums
- **Efficient Storage** - MessagePack binary serialization
- **Fast Indexing** - Incremental updates, only processes changed files
- **No External Dependencies** - Simple, reliable, maintainable

## Storage

- **Index:** `cc-devtools/.cache/source-code-index.msgpack`
- **Format:** MessagePack binary (compact and fast)
- **Created:** Automatically on first use
- **Version Control:** Should be gitignored (ephemeral cache)
- **Rebuild:** Automatically rebuilt if cache is missing

## Language Support

The source code mapper works immediately without any setup using comprehensive regex-based parsing.

### Supported Languages (30+)

The following languages have dedicated, optimized regex patterns:

**Tier 1 - Comprehensive Coverage:**
- **JavaScript/TypeScript** - Functions, arrow functions, classes, methods, interfaces, types, enums, imports/exports
- **Python** - Functions, async functions, classes, methods, decorators, imports
- **Java** - Classes, interfaces, methods, constructors, fields, annotations
- **C#** - Classes, interfaces, methods, properties, attributes
- **Go** - Functions, methods, structs, interfaces, types, imports
- **Rust** - Functions, structs, impls, traits, enums, consts
- **Ruby** - Classes, modules, methods, blocks
- **PHP** - Classes, functions, methods, namespaces
- **C/C++** - Functions, classes, structs, methods
- **Swift** - Classes, structs, protocols, functions, methods

**Tier 2 - Good Coverage:**
- **Kotlin** - Classes, functions, interfaces, objects
- **Scala** - Classes, objects, traits, functions
- **Dart** - Classes, functions, methods
- **R** - Functions, classes
- **Objective-C** - Classes, methods, protocols
- **Shell/Bash** - Functions
- **Perl** - Subroutines, packages
- **Lua** - Functions, tables
- **Elixir** - Modules, functions
- **Clojure** - Functions, defns

**Tier 3 - Basic Coverage:**
- **Haskell** - Functions, types, data declarations
- **OCaml** - Functions, modules, types
- **F#** - Functions, types, modules
- **Julia** - Functions, types
- **Groovy** - Classes, methods
- **MATLAB** - Functions
- **Fortran** - Subroutines, functions
- **COBOL** - Procedures, programs
- **Assembly** - Labels, procedures
- **Lisp** - Functions, defuns

**All languages support:**
- Symbol extraction (varying levels of detail)
- Import/export detection (where applicable)
- Line number tracking
- Context snippets

## MCP Tools

### `search_code`

Search for code symbols across your codebase.

**Parameters:**
- `query` (required, string) - Search query (symbol name or description)
- `mode` (optional, string) - Search mode: "exact", "fuzzy", or "semantic" (default: "exact")
- `type` (optional, string) - Filter by symbol type (function, class, interface, type, variable)
- `limit` (optional, number) - Maximum results to return (default: 10)

**Returns:**
```json
{
  "results": [
    {
      "symbol": "handleUserAuth",
      "type": "function",
      "file": "src/auth/handlers.ts",
      "line": 42,
      "context": "export async function handleUserAuth(req: Request) {...}",
      "score": 0.95
    }
  ],
  "query": "handleUserAuth",
  "mode": "exact",
  "totalResults": 1
}
```

**Search Modes:**

1. **Exact Mode** - Case-sensitive exact symbol name matching
   - Use for: Finding specific functions/classes by exact name
   - Example: `query: "handleUserAuth"` finds `handleUserAuth` exactly

2. **Fuzzy Mode** - Case-insensitive substring matching
   - Use for: Partial name matching, exploring similar names
   - Example: `query: "auth"` finds `handleAuth`, `authMiddleware`, `isAuthenticated`

3. **Semantic Mode** - Embedding-based similarity search
   - Use for: Finding symbols by purpose/description
   - Example: `query: "validate user credentials"` finds auth-related functions

**Example:**
```json
{
  "query": "authentication",
  "mode": "fuzzy",
  "type": "function",
  "limit": 5
}
```

### `query_imports`

Query import relationships and dependencies.

**Parameters:**
- `file` (optional, string) - File path to query imports for
- `symbol` (optional, string) - Symbol name to find importers of
- `direction` (optional, string) - "imported" (what file imports) or "importers" (who imports file/symbol)

**Returns:**
```json
{
  "file": "src/auth/handlers.ts",
  "imports": [
    {
      "source": "src/auth/handlers.ts",
      "imported": ["validateToken", "generateToken"],
      "from": "src/auth/jwt.ts"
    }
  ],
  "importers": [
    {
      "file": "src/api/routes.ts",
      "imports": ["handleUserAuth"]
    }
  ]
}
```

**Use Cases:**
- Find what a file imports: `{"file": "src/auth.ts", "direction": "imported"}`
- Find who imports a file: `{"file": "src/auth.ts", "direction": "importers"}`
- Find who uses a symbol: `{"symbol": "handleAuth", "direction": "importers"}`

### `get_file_info`

Get detailed information about symbols and imports in a specific file.

**Parameters:**
- `file` (required, string) - File path to analyze

**Returns:**
```json
{
  "file": "src/auth/handlers.ts",
  "symbols": [
    {
      "name": "handleUserAuth",
      "type": "function",
      "line": 42,
      "context": "export async function handleUserAuth(req: Request) {...}"
    },
    {
      "name": "AuthHandler",
      "type": "class",
      "line": 58,
      "context": "export class AuthHandler {...}"
    }
  ],
  "imports": [
    {
      "imported": ["Request", "Response"],
      "from": "express"
    },
    {
      "imported": ["validateToken"],
      "from": "./jwt"
    }
  ],
  "exports": [
    "handleUserAuth",
    "AuthHandler"
  ]
}
```

## Viewing Index Statistics

Use the `stats` command to view information about your indexed codebase:

```bash
npx cc-devtools scm stats
```

This displays:
- Total files indexed
- Total symbols found
- Breakdown by symbol type (functions, classes, etc.)
- Top 5 files by symbol count
- Last index timestamp

**Example output:**
```
Index Statistics:
=================

Files indexed:     142
Symbols found:     856
Indexed at:        10/20/2025, 3:45:12 PM

Symbols by type:
  function     425
  class        128
  interface     89
  type          76
  method        64
  variable      52
  enum          22

Top 5 files by symbol count:
  142  ./src/auth/handlers.ts
   98  ./src/api/routes.ts
   76  ./src/core/database.ts
   64  ./src/utils/helpers.ts
   52  ./src/types/index.ts
```

## Symbol Types

### Functions
- Function declarations
- Arrow functions
- Method definitions
- Async functions

### Classes
- Class declarations
- Abstract classes
- Class expressions

### Interfaces
- Interface declarations (TypeScript)
- Protocol definitions (Swift)

### Types
- Type aliases (TypeScript)
- Struct definitions (Rust, Go)
- Enum definitions

### Variables
- Variable declarations (const, let, var)
- Constants
- Module-level variables

## Search Algorithm

### Exact Search
1. Normalize symbol names (case-sensitive)
2. Match query exactly against symbol names
3. Return all exact matches
4. Sort by file path and line number

### Fuzzy Search
1. Normalize query and symbols (case-insensitive)
2. Check if symbol contains query as substring
3. Calculate match score based on position and length
4. Sort by score, then alphabetically

### Semantic Search
1. Generate embedding for search query
2. Compare against cached symbol embeddings
3. Calculate cosine similarity (0-1)
4. Filter by threshold (default 0.5)
5. Sort by similarity score

## Import Graph Tracking

### Direct Imports
Tracks import statements:
```typescript
import { foo, bar } from './utils';
import * as helpers from './helpers';
import defaultExport from './default';
```

### Re-exports
Tracks re-export patterns:
```typescript
export { foo } from './utils';
export * from './helpers';
```

### Import Relationships
- **Forward tracking** - What does file X import?
- **Reverse tracking** - Who imports file X?
- **Symbol tracking** - Who imports symbol Y?

## File Watching

Automatic index updates via chokidar:

### Watched Events
- **File added** - Index new file
- **File changed** - Re-index modified file
- **File deleted** - Remove from index

### Ignored Patterns
Respects `.gitignore` plus additional patterns:
- `node_modules/`
- `.git/`
- `dist/`, `build/`
- `*.test.js`, `*.spec.ts`
- Hidden files (`.*)

### Performance
- Incremental updates (only changed files)
- Debounced re-indexing (500ms delay)
- Background processing (non-blocking)

## Data Schema

### Symbol Entry

```typescript
interface Symbol {
  name: string;           // Symbol name
  type: SymbolType;       // function, class, etc.
  file: string;           // File path (relative to project root)
  line: number;           // Line number
  context: string;        // Code snippet
  embedding?: number[];   // 384-dimensional vector (semantic search)
}
```

### Import Entry

```typescript
interface Import {
  source: string;         // File doing the import
  imported: string[];     // Symbols imported
  from: string;           // File being imported from
  type: 'named' | 'default' | 'namespace';
}
```

### Index Structure

```typescript
interface Index {
  version: string;        // Index version
  symbols: Symbol[];      // All indexed symbols
  imports: Import[];      // All import relationships
  files: string[];        // All indexed files
  indexed_at: number;     // Unix timestamp
}
```

## Configuration

No configuration file needed. Default behavior:

- **Watch mode:** Enabled when MCP server starts
- **Debounce delay:** 500ms for file changes
- **Semantic threshold:** 0.5 for similarity matching
- **Search limit:** 10 results (configurable per query)
- **Embedding model:** Xenova/all-MiniLM-L6-v2

## Best Practices

### Search Strategies

**Finding Specific Symbols:**
```json
{"query": "handleUserAuth", "mode": "exact"}
```

**Exploring Related Code:**
```json
{"query": "auth", "mode": "fuzzy", "type": "function"}
```

**Finding by Purpose:**
```json
{"query": "validate user credentials", "mode": "semantic"}
```

### Import Analysis

**Understanding Dependencies:**
```json
{"file": "src/api/routes.ts", "direction": "imported"}
```

**Finding Usage:**
```json
{"symbol": "authMiddleware", "direction": "importers"}
```

**Impact Analysis:**
```json
{"file": "src/utils/helpers.ts", "direction": "importers"}
```

### Performance Tips

1. **Use exact mode for known symbols** - Faster than fuzzy/semantic
2. **Limit results** - Request only what you need
3. **Filter by type** - Narrows search space
4. **Let index build** - First indexing takes time, subsequent updates are fast

## Use Cases

### Code Navigation
```json
{
  "query": "UserAuthHandler",
  "mode": "exact"
}
// Find exact class definition
```

### Refactoring
```json
{
  "symbol": "oldFunctionName",
  "direction": "importers"
}
// Find all files that need updating
```

### Architecture Understanding
```json
{
  "file": "src/core/database.ts",
  "direction": "importers"
}
// See what depends on database layer
```

### Feature Discovery
```json
{
  "query": "email validation",
  "mode": "semantic"
}
// Find validation-related functions
```

## Troubleshooting

### Index Not Building

**Check:**
1. File permissions on `cc-devtools/.cache/`
2. Valid syntax (parse errors may skip file, but this is rare with regex parsing)
3. File not in .gitignore
4. Check MCP server logs for errors

**Note:** All source files are scanned automatically using regex parsing.

### Search Returns No Results

**Check:**
1. Index built - Check `cc-devtools/.cache/source-code-index.msgpack` exists
2. Search mode - Try fuzzy instead of exact
3. Symbol type filter - Remove filter to search all types
4. Verify files were scanned - Use `npx cc-devtools scm stats` to check

**Tip:** The tool uses comprehensive regex parsing. If specific symbols aren't found, they may use non-standard syntax patterns.

### Slow Indexing

**First Run:**
- Large codebases take time
- Regex parsing: ~500-1000 files/second
- Expected time for 10,000 files: ~10-20 seconds

**Subsequent Runs:**
- Only changed files are re-indexed
- Watch mode is incremental and fast
- Most changes update in <1 second

### Import Graph Incomplete

**Common Issues:**
1. **Dynamic imports** - Only static imports tracked
2. **Require statements** - May not be fully supported (use ESM)
3. **Path aliases** - Ensure tsconfig paths are resolvable
4. **External packages** - Only project files tracked

## Integration with Claude Code

The Source Code Mapper enables Claude Code to:

1. **Navigate Codebase** - Find functions and classes quickly
2. **Understand Architecture** - Analyze import dependencies
3. **Refactor Safely** - Find all usages before changes
4. **Discover Features** - Search by purpose/description
5. **Impact Analysis** - See what depends on what

## Implementation Details

### Parsing Strategy

The source code mapper uses a comprehensive regex-based parsing approach:

1. **Detect file language** - Based on file extension
2. **Select language-specific patterns** - Use optimized regex for the language
3. **Extract symbols** - Parse functions, classes, interfaces, types, etc.
4. **Generic fallback** - If language-specific patterns not available, use generic patterns

This ensures the tool always works for any text-based source file, with no dependencies or setup required.

### Regex Pattern Design

Each language has carefully crafted patterns that:
- Use named capture groups for readability
- Handle multi-line definitions with appropriate flags
- Account for common formatting styles (Prettier, ESLint, etc.)
- Capture metadata (export status, access modifiers, async/static flags)
- Extract line numbers for accurate file references
- Support both minified and formatted code

**Example pattern (JavaScript function):**
```typescript
/(?:export\s+)?(?:async\s+)?function\s+(?<name>\w+)\s*\((?<params>[^)]*)\)/g
```

This captures:
- Optional `export` keyword
- Optional `async` modifier
- Function name
- Parameters

### Adding Language Support

To add or improve language support:

1. **Add patterns** in `src/source-code-mapper/services/parser.ts`
2. **Test with real code** from the target language
3. **Handle edge cases** (comments, strings, special syntax)
4. **Document coverage** in the README

Contributions welcome!

## Performance Characteristics

### Indexing Speed
- **Small projects** (<1000 files): ~2-5 seconds
- **Medium projects** (1000-5000 files): ~10-30 seconds
- **Large projects** (5000+ files): ~1-3 minutes

### Search Speed
- **Exact search:** <10ms
- **Fuzzy search:** <50ms
- **Semantic search:** ~100-500ms (embedding generation)

### Memory Usage
- **Index size:** ~1-5KB per file indexed
- **Embedding cache:** ~1.5KB per symbol (if semantic search used)
- **Runtime memory:** ~50-200MB depending on index size

## Related Documentation

- [Main README](../../README.md) - Package documentation
- [CHANGELOG](../../CHANGELOG.md) - Version history

## Support

- **Issues:** [GitHub Issues](https://github.com/shaenchen/cc-devtools/issues)
- **Main Documentation:** [cc-devtools README](../../README.md)
