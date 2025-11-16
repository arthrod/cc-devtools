/**
 * Core type definitions for source code mapper
 */

import type { WithScore } from '../shared/types/common.js';

export type SymbolType = 'function' | 'class' | 'interface' | 'type' | 'const' | 'enum';

export interface SymbolInfo {
  name: string;
  type: SymbolType;
  startLine: number;
  endLine: number;
  isExported: boolean;
  signature?: string;
  file: string;
}

export interface Import {
  source: string;
  imported: string[];
  usedBy: string[];
}

export interface FileImports {
  file: string;
  imports: Import[];
}

export interface FileInfo {
  file: string;
  symbols: SymbolInfo[];
  imports: Import[];
  exports: string[];
}

export interface Index {
  symbols: Map<string, SymbolInfo[]>;
  imports: Map<string, Import[]>;
  embeddings: Map<string, Float32Array>;
  metadata: IndexMetadata;
}

// @type-duplicate-allowed
export type IndexMetadata = {
  version: string;
  indexedAt: number;
  fileCount: number;
  symbolCount: number;
};

export interface SearchFilters {
  type?: SymbolType[];
  exported_only?: boolean;
}

export type SearchResult = WithScore<SymbolInfo>;

export type SearchMode = 'exact' | 'semantic' | 'fuzzy';

export interface LanguageConfig {
  name: string;
  extensions: string[];
}

/**
 * Supported languages for regex-based parsing
 * Maps file extensions to language identifiers for parser selection
 */
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  // Web & JavaScript ecosystem
  { name: 'javascript', extensions: ['.js', '.jsx', '.mjs', '.cjs'] },
  { name: 'typescript', extensions: ['.ts', '.tsx'] },
  { name: 'html', extensions: ['.html', '.htm'] },
  { name: 'css', extensions: ['.css'] },
  { name: 'scss', extensions: ['.scss'] },
  { name: 'vue', extensions: ['.vue'] },
  { name: 'svelte', extensions: ['.svelte'] },

  // Systems programming
  { name: 'c', extensions: ['.c', '.h'] },
  { name: 'cpp', extensions: ['.cpp', '.hpp', '.cc', '.cxx', '.hxx'] },
  { name: 'rust', extensions: ['.rs'] },
  { name: 'go', extensions: ['.go'] },
  { name: 'zig', extensions: ['.zig'] },

  // JVM languages
  { name: 'java', extensions: ['.java'] },
  { name: 'kotlin', extensions: ['.kt', '.kts'] },
  { name: 'scala', extensions: ['.scala', '.sc'] },
  { name: 'clojure', extensions: ['.clj', '.cljs', '.cljc', '.edn'] },
  { name: 'groovy', extensions: ['.groovy', '.gradle'] },

  // .NET ecosystem
  { name: 'csharp', extensions: ['.cs'] },
  { name: 'fsharp', extensions: ['.fs', '.fsi', '.fsx'] },

  // Scripting languages
  { name: 'python', extensions: ['.py', '.pyi'] },
  { name: 'ruby', extensions: ['.rb', '.rake'] },
  { name: 'php', extensions: ['.php'] },
  { name: 'perl', extensions: ['.pl', '.pm'] },
  { name: 'lua', extensions: ['.lua'] },
  { name: 'bash', extensions: ['.sh', '.bash'] },

  // Functional languages
  { name: 'haskell', extensions: ['.hs', '.lhs'] },
  { name: 'ocaml', extensions: ['.ml', '.mli'] },
  { name: 'elixir', extensions: ['.ex', '.exs'] },
  { name: 'elm', extensions: ['.elm'] },
  { name: 'erlang', extensions: ['.erl', '.hrl'] },
  { name: 'scheme', extensions: ['.scm', '.ss'] },
  { name: 'racket', extensions: ['.rkt'] },
  { name: 'commonlisp', extensions: ['.lisp', '.cl'] },

  // Mobile & application development
  { name: 'swift', extensions: ['.swift'] },
  { name: 'objc', extensions: ['.mm', '.h'] }, // .mm for Objective-C++, .h headers can be Obj-C
  { name: 'dart', extensions: ['.dart'] },

  // Data & scientific computing
  { name: 'r', extensions: ['.r', '.R'] },
  { name: 'julia', extensions: ['.jl'] },
  { name: 'matlab', extensions: ['.m'] }, // .m files are primarily MATLAB in scientific contexts
  { name: 'fortran', extensions: ['.f', '.f90', '.f95', '.for'] },
  { name: 'cobol', extensions: ['.cob', '.cbl', '.cobol'] },

  // Data formats
  { name: 'json', extensions: ['.json', '.jsonc'] },
  { name: 'yaml', extensions: ['.yaml', '.yml'] },
  { name: 'toml', extensions: ['.toml'] },
  { name: 'xml', extensions: ['.xml'] },

  // Documentation & markup
  { name: 'markdown', extensions: ['.md', '.markdown'] },
  { name: 'latex', extensions: ['.tex'] },

  // Database & query languages
  { name: 'sql', extensions: ['.sql'] },
  { name: 'graphql', extensions: ['.graphql', '.gql'] },

  // Interface definition & protocols
  { name: 'protobuf', extensions: ['.proto'] },

  // Blockchain & smart contracts
  { name: 'solidity', extensions: ['.sol'] },

  // DevOps & configuration
  { name: 'dockerfile', extensions: ['Dockerfile', '.dockerfile'] },
  { name: 'hcl', extensions: ['.hcl', '.tf'] },
  { name: 'nix', extensions: ['.nix'] },

  // Build systems
  { name: 'make', extensions: ['Makefile', '.make', '.mk'] },
  { name: 'cmake', extensions: ['CMakeLists.txt', '.cmake'] },

  // Graphics & shaders
  { name: 'glsl', extensions: ['.glsl', '.vert', '.frag'] },

  // Hardware description
  { name: 'verilog', extensions: ['.v', '.vh'] },

  // Assembly
  { name: 'assembly', extensions: ['.asm', '.s', '.S'] },

  // Other
  { name: 'vim', extensions: ['.vim'] },
  { name: 'regex', extensions: ['.regex'] },
  { name: 'comment', extensions: [] },
];

export const STANDARD_IGNORE_PATTERNS = [
  'node_modules/**',
  '.venv/**',
  'venv/**',
  '__pycache__/**',
  'vendor/**',
  'target/**',
  'dist/**',
  'build/**',
  '.git/**',
  '.next/**',
  '.nuxt/**',
  'coverage/**',
  '*.min.js',
  '*.bundle.js',
];

/**
 * File watcher interface
 */
export interface FileWatcher {
  start(): void;
  stop(): void;
}

/**
 * Parse result from file parsing
 */
export interface ParseResult {
  symbols: SymbolInfo[];
  imports: Import[];
}
