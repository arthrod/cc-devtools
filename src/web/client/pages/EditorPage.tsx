/**
 * Editor page - code editor with file tree
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { EditorLayout } from '../components/editor/EditorLayout';
import { useFileTree, useFileContent, useSaveFile } from '../hooks/useFiles';
import { useToast } from '../hooks/useToast';

export const EditorPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const { showToast } = useToast();

  // Fetch file tree
  const { data: fileTree, isLoading: isLoadingTree, error: treeError } = useFileTree('.');

  // Fetch file content when a file is selected
  const {
    data: fetchedFileContent,
    isLoading: isLoadingFile,
    error: fileError,
  } = useFileContent(selectedFile);

  // Save file mutation
  const saveFileMutation = useSaveFile();

  // Track the last saved content to detect changes
  const savedContentRef = useRef<string>('');

  // Update file content when fetched data changes
  useEffect(() => {
    if (fetchedFileContent) {
      setFileContent(fetchedFileContent.content);
      savedContentRef.current = fetchedFileContent.content;
      setIsDirty(false);
    }
  }, [fetchedFileContent]);

  // Handle file selection
  const handleFileSelect = useCallback((path: string) => {
    setSelectedFile(path);
    setIsDirty(false);
  }, []);

  // Handle file content change
  const handleFileChange = useCallback((content: string) => {
    setFileContent(content);
    setIsDirty(content !== savedContentRef.current);
  }, []);

  // Handle file save
  const handleFileSave = useCallback(() => {
    if (!selectedFile || !isDirty) return;

    saveFileMutation.mutate(
      {
        path: selectedFile,
        content: fileContent,
      },
      {
        onSuccess: () => {
          savedContentRef.current = fileContent;
          setIsDirty(false);
        },
        onError: (error) => {
          console.error('Failed to save file:', error);
          showToast(`Failed to save file: ${error instanceof Error ? error.message : String(error)}`, 'error');
        },
      }
    );
  }, [selectedFile, isDirty, fileContent, saveFileMutation, showToast]);

  // Auto-save on Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleFileSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFileSave]);

  return (
    <div className="h-screen flex flex-col">
      {/* Editor Layout */}
      <div className="flex-1 overflow-hidden">
        <EditorLayout
          fileTree={fileTree ?? null}
          selectedFile={selectedFile}
          fileContent={
            fetchedFileContent
              ? {
                  path: fetchedFileContent.path,
                  content: fileContent,
                  language: fetchedFileContent.language,
                  size: fetchedFileContent.size,
                }
              : null
          }
          isLoadingTree={isLoadingTree}
          isLoadingFile={isLoadingFile}
          fileError={
            fileError instanceof Error
              ? fileError.message
              : treeError instanceof Error
                ? treeError.message
                : null
          }
          isDirty={isDirty}
          onFileSelect={handleFileSelect}
          onFileChange={handleFileChange}
          onFileSave={handleFileSave}
        />
      </div>
    </div>
  );
};
