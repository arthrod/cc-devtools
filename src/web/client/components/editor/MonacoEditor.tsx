/**
 * Monaco Editor component for desktop
 * VS Code's editor with full IDE features
 */

import React, { useCallback, useRef, useEffect } from 'react';
import Editor, { type OnMount, type OnChange } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';

const LANGUAGE_MAP: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.java': 'java',
  '.cs': 'csharp',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.c': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.scala': 'scala',
  '.dart': 'dart',
  '.r': 'r',
  '.R': 'r',
  '.m': 'objective-c',
  '.mm': 'objective-c',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.pl': 'perl',
  '.lua': 'lua',
  '.ex': 'elixir',
  '.exs': 'elixir',
  '.clj': 'clojure',
  '.cljs': 'clojure',
  '.json': 'json',
  '.md': 'markdown',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
  '.xml': 'xml',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql',
};

interface MonacoEditorProps {
  value: string;
  language?: string;
  filePath?: string;
  onChange?: (value: string | undefined) => void;
  onSave?: () => void;
  theme?: 'light' | 'dark';
  fontSize?: number;
  tabSize?: number;
  readOnly?: boolean;
}

/**
 * Detect programming language from file extension
 */
function detectLanguage(path: string): string {
  if (!path) return 'plaintext';

  const extension = path.toLowerCase().split('.').pop();
  if (!extension) return 'plaintext';

  return LANGUAGE_MAP[`.${extension}`] ?? 'plaintext';
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  language,
  filePath,
  onChange,
  onSave,
  theme = 'light',
  fontSize = 14,
  tabSize = 2,
  readOnly = false,
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleEditorDidMount: OnMount = useCallback(
    (editor) => {
      editorRef.current = editor;

      // Add keyboard shortcuts
      editor.addCommand(
        // Ctrl+S / Cmd+S
        (window.navigator.platform.match('Mac') ? monaco.KeyMod.CtrlCmd : monaco.KeyMod.CtrlCmd) |
          monaco.KeyCode.KeyS,
        () => {
          onSave?.();
        }
      );

      editor.focus();
    },
    [onSave]
  );

  const handleEditorChange: OnChange = useCallback(
    (value) => {
      onChange?.(value);

      // Clear existing timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Set new timer for auto-save (1 second after typing stops)
      if (onSave && !readOnly) {
        saveTimerRef.current = setTimeout(() => {
          onSave();
        }, 1000);
      }
    },
    [onChange, onSave, readOnly]
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const resolvedLanguage = language ?? (filePath ? detectLanguage(filePath) : 'plaintext');
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

  return (
    <div className="w-full h-full">
      <Editor
        value={value}
        language={resolvedLanguage}
        theme={monacoTheme}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          fontSize,
          lineHeight: fontSize * 1.5,
          tabSize,
          wordWrap: 'on',
          lineNumbers: 'on',
          minimap: { enabled: false }, // Disable for Phase 1
          readOnly,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showFunctions: true,
            showConstants: true,
            showVariables: true,
          },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
          parameterHints: { enabled: true },
          hover: { enabled: true },
          contextmenu: true,
          selectOnLineNumbers: true,
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'always',
          cursorStyle: 'line',
          cursorBlinking: 'blink',
          renderLineHighlight: 'line',
          smoothScrolling: true,
          mouseWheelZoom: true,
        }}
      />
    </div>
  );
};
