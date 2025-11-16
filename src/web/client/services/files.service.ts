/**
 * Files API service
 */

import apiClient from './api.service';

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: FileTreeNode[];
}

export interface FileContent {
  path: string;
  content: string;
  language: string;
  size: number;
}

export interface SaveFileRequest {
  path: string;
  content: string;
}

/**
 * Get file tree
 */
export async function getFileTree(path: string = '.'): Promise<FileTreeNode> {
  const response = await apiClient.get<{ data: FileTreeNode }>('/files', {
    params: { path },
  });
  return response.data.data;
}

/**
 * Get file content
 */
export async function getFileContent(path: string): Promise<FileContent> {
  const response = await apiClient.get<{ data: FileContent }>('/files/content', {
    params: { path },
  });
  return response.data.data;
}

/**
 * Save file content
 */
export async function saveFileContent(request: SaveFileRequest): Promise<void> {
  await apiClient.post('/files/content', request);
}
