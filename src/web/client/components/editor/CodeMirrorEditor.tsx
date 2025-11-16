/**
 * CodeMirror Editor component for mobile
 * Lightweight editor optimized for touch devices
 */

import React, { useEffect, useRef } from 'react';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { php } from '@codemirror/lang-php';
import { rust } from '@codemirror/lang-rust';
import { sql } from '@codemirror/lang-sql';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import {
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  keymap
} from '@codemirror/view';
import { history, historyKeymap } from '@codemirror/commands';
import {
  foldGutter,
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldKeymap
} from '@codemirror/language';
import { lineNumbers, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';

interface CodeMirrorEditorProps {
  value: string;
  language?: string;
  filePath?: string;
  onChange?: (value: string) => void;
  onSave?: () => void;
  theme?: 'light' | 'dark';
  fontSize?: number;
  tabSize?: number;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  wordWrap?: boolean;
}

/**
 * Get CodeMirror language extension
 */
function getLanguageExtension(lang: string): Extension | null {
  const langMap: Record<string, Extension> = {
    javascript: javascript(),
    typescript: javascript({ typescript: true }),
    python: python(),
    css: css(),
    html: html(),
    json: json(),
    markdown: markdown(),
    cpp: cpp(),
    c: cpp(),
    java: java(),
    php: php(),
    rust: rust(),
    sql: sql(),
    xml: xml(),
    yaml: yaml(),
  };

  return langMap[lang] ?? null;
}

/**
 * Detect language from file extension
 */
function detectLanguage(path: string): string {
  if (!path) return 'plaintext';

  const ext = path.toLowerCase().split('.').pop();
  if (!ext) return 'plaintext';

  const extMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    css: 'css',
    html: 'html',
    htm: 'html',
    json: 'json',
    md: 'markdown',
    cpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    java: 'java',
    php: 'php',
    rs: 'rust',
    sql: 'sql',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
  };

  return extMap[ext] ?? 'plaintext';
}

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  language,
  filePath,
  onChange,
  onSave,
  theme = 'light',
  fontSize = 14,
  tabSize = 2,
  readOnly = false,
  showLineNumbers = true,
  wordWrap = true,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const resolvedLanguage = language ?? (filePath ? detectLanguage(filePath) : 'plaintext');
    const langExtension = getLanguageExtension(resolvedLanguage);

    // Basic setup equivalent
    const basicExtensions: Extension[] = [
      highlightSpecialChars(),
      history(),
      foldGutter(),
      drawSelection(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap
      ])
    ];

    const extensions: Extension[] = [...basicExtensions];

    // Conditionally add line numbers
    if (showLineNumbers) {
      extensions.push(lineNumbers());
      extensions.push(highlightActiveLineGutter());
    }

    // Conditionally add word wrap
    if (wordWrap) {
      extensions.push(EditorView.lineWrapping);
    }

    // Add language support if available
    if (langExtension) {
      extensions.push(langExtension);
    }

    // Add theme
    if (theme === 'dark') {
      extensions.push(oneDark);
    }

    // Add update listener with auto-save debounce
    extensions.push(
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString();

          // Call onChange immediately for UI updates
          if (onChange) {
            onChange(newValue);
          }

          // Clear existing save timer
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
          }

          // Set new timer for auto-save (1 second after typing stops)
          if (onSave && !readOnly) {
            saveTimerRef.current = setTimeout(() => {
              onSave();
            }, 1000);
          }
        }
      })
    );

    // Create editor state
    const state = EditorState.create({
      doc: value,
      extensions,
    });

    // Create editor view
    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Cleanup
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      view.destroy();
      viewRef.current = null;
    };
  }, [filePath, language, onChange, onSave, readOnly, theme, value, showLineNumbers, wordWrap]);

  // Handle read-only mode
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.contentDOM.contentEditable = readOnly ? 'false' : 'true';
    }
  }, [readOnly]);

  return (
    <div
      ref={editorRef}
      className="h-full w-full overflow-auto"
      style={{
        fontSize: `${fontSize}px`,
      }}
    />
  );
};
