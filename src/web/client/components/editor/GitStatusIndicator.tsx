import React from 'react';
import {
  FileText,
  FilePlus,
  FileX,
  GitBranch,
  AlertTriangle,
  FileEdit,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import type { GitStatusType } from '../../../shared/types/git';

export interface GitStatusIndicatorProps {
  status: GitStatusType;
  staged?: boolean;
  unstaged?: boolean;
  className?: string;
  size?: number;
  showTooltip?: boolean;
}

export const GitStatusIndicator: React.FC<GitStatusIndicatorProps> = ({
  status,
  staged = false,
  unstaged = false,
  className = '',
  size = 12,
  showTooltip = true,
}) => {
  const getStatusIcon = (): JSX.Element => {
    switch (status) {
      case 'modified':
        return <FileEdit className={`text-yellow-500 ${className}`} size={size} />;
      case 'added':
        return <FilePlus className={`text-green-500 ${className}`} size={size} />;
      case 'deleted':
        return <FileX className={`text-red-500 ${className}`} size={size} />;
      case 'renamed':
        return <RotateCcw className={`text-blue-500 ${className}`} size={size} />;
      case 'copied':
        return <FileCheck className={`text-blue-400 ${className}`} size={size} />;
      case 'untracked':
        return <FileText className={`text-gray-500 ${className}`} size={size} />;
      case 'ignored':
        return <FileText className={`text-gray-300 ${className}`} size={size} />;
      case 'conflicted':
        return <AlertTriangle className={`text-red-600 ${className}`} size={size} />;
      case 'clean':
      default:
        return <FileCheck className={`text-green-400 ${className}`} size={size} />;
    }
  };

  const getStatusText = (): string => {
    const baseStatus = status.charAt(0).toUpperCase() + status.slice(1);
    const stagingInfo = [];

    if (staged) stagingInfo.push('staged');
    if (unstaged) stagingInfo.push('unstaged');

    if (stagingInfo.length > 0) {
      return `${baseStatus} (${stagingInfo.join(', ')})`;
    }

    return baseStatus;
  };

  const statusIcon = getStatusIcon();
  const statusText = getStatusText();

  if (showTooltip) {
    return (
      <div
        className="flex-shrink-0"
        title={statusText}
        aria-label={`Git status: ${statusText}`}
      >
        {statusIcon}
      </div>
    );
  }

  return statusIcon;
};

/**
 * GitBranchIndicator component for displaying current branch information
 */
interface GitBranchIndicatorProps {
  branch: string | null;
  hasChanges?: boolean;
  className?: string;
  size?: number;
}

export const GitBranchIndicator: React.FC<GitBranchIndicatorProps> = ({
  branch,
  hasChanges = false,
  className = '',
  size = 16,
}) => {
  if (!branch) return null;

  return (
    <div
      className={`flex items-center space-x-1 text-sm ${className}`}
      title={`Current branch: ${branch}${hasChanges ? ' (has changes)' : ''}`}
    >
      <GitBranch
        className={hasChanges ? 'text-yellow-500' : 'text-gray-500 dark:text-gray-400'}
        size={size}
      />
      <span className={hasChanges ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}>
        {branch}
      </span>
      {hasChanges && (
        <span className="w-2 h-2 bg-yellow-500 rounded-full" aria-label="Has uncommitted changes" />
      )}
    </div>
  );
};

/**
 * GitStatusBadge component for a more prominent status display
 */
interface GitStatusBadgeProps {
  status: GitStatusType;
  staged?: boolean;
  unstaged?: boolean;
  className?: string;
}

export const GitStatusBadge: React.FC<GitStatusBadgeProps> = ({
  status,
  staged = false,
  unstaged = false,
  className = '',
}) => {
  if (status === 'clean') return null;

  const getStatusCode = (): string => {
    switch (status) {
      case 'modified':
        return 'M';
      case 'added':
        return 'A';
      case 'deleted':
        return 'D';
      case 'renamed':
        return 'R';
      case 'copied':
        return 'C';
      case 'untracked':
        return 'U';
      case 'ignored':
        return 'I';
      case 'conflicted':
        return '!';
      default:
        return '?';
    }
  };

  const getBadgeColor = (): string => {
    switch (status) {
      case 'modified':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700';
      case 'added':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
      case 'deleted':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
      case 'renamed':
      case 'copied':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700';
      case 'untracked':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700';
      case 'conflicted':
        return 'bg-red-200 text-red-900 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-600';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const statusCode = getStatusCode();
  const badgeColor = getBadgeColor();
  const stagingIndicator = staged && unstaged ? '±' : staged ? '+' : unstaged ? '~' : '';

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium border ${badgeColor} ${className}`}
      title={`Git status: ${status}${staged ? ' (staged)' : ''}${unstaged ? ' (unstaged)' : ''}`}
    >
      {statusCode}{stagingIndicator}
    </span>
  );
};
