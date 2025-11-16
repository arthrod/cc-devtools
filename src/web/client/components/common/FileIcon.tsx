/**
 * File icon component - displays appropriate icon for file type
 */

import React from 'react';
import {
  FileText,
  FileCode,
  FileJson,
  FileImage,
  FileType,
  Database,
  Package,
  Settings,
} from 'lucide-react';

interface FileIconProps {
  fileName: string;
  className?: string;
}

/**
 * Get icon component for file based on extension
 */
function getFileIcon(fileName: string, iconClassName: string): React.ReactNode {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';

  // Programming languages
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cs', 'go', 'rs', 'rb', 'php', 'c', 'cpp', 'cc', 'h', 'hpp', 'swift', 'kt', 'scala', 'dart', 'r', 'm', 'mm', 'sh', 'bash', 'pl', 'lua', 'ex', 'clj'].includes(ext)) {
    return <FileCode className={`${iconClassName} text-blue-500`} />;
  }

  // Config files
  if (['json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config'].includes(ext)) {
    return <Settings className={`${iconClassName} text-yellow-500`} />;
  }

  // Data files
  if (['sql', 'db', 'sqlite'].includes(ext)) {
    return <Database className={`${iconClassName} text-purple-500`} />;
  }

  // Package files
  if (['package', 'lock'].includes(ext) || fileName === 'package.json' || fileName === 'package-lock.json') {
    return <Package className={`${iconClassName} text-red-500`} />;
  }

  // JSON
  if (ext === 'json') {
    return <FileJson className={`${iconClassName} text-yellow-600`} />;
  }

  // Images
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) {
    return <FileImage className={`${iconClassName} text-green-500`} />;
  }

  // Markdown/docs
  if (['md', 'mdx', 'txt', 'doc', 'pdf'].includes(ext)) {
    return <FileText className={`${iconClassName} text-gray-500`} />;
  }

  // Markup/styles
  if (['html', 'htm', 'xml', 'css', 'scss', 'sass', 'less'].includes(ext)) {
    return <FileType className={`${iconClassName} text-orange-500`} />;
  }

  // Default
  return <FileText className={`${iconClassName} text-gray-400`} />;
}

export const FileIcon: React.FC<FileIconProps> = ({
  fileName,
  className = 'w-4 h-4',
}) => {
  const icon = getFileIcon(fileName, className);

  return <>{icon}</>;
};
