import { Badge } from '../shared/Badge.js';

interface ConfigStatusBadgeProps {
  filesNew: number;
  filesOutOfDate: number;
  filesUpToDate: number;
  totalFiles: number;
  isRunning?: boolean;
  className?: string;
}

/**
 * Status badge component showing file processing state
 */
export function ConfigStatusBadge({
  filesNew,
  filesOutOfDate,
  filesUpToDate,
  totalFiles,
  isRunning = false,
  className = '',
}: ConfigStatusBadgeProps): JSX.Element {
  if (isRunning) {
    return (
      <Badge variant="primary" className={className}>
        🔄 Running
      </Badge>
    );
  }

  const needsProcessing = filesNew + filesOutOfDate;

  if (needsProcessing === 0 && filesUpToDate === totalFiles) {
    return (
      <Badge variant="success" className={className}>
        ✓ All up-to-date ({totalFiles} files)
      </Badge>
    );
  }

  if (filesNew > 0 && filesOutOfDate === 0) {
    return (
      <Badge variant="neutral" className={className}>
        ● {filesNew} new ({totalFiles} total)
      </Badge>
    );
  }

  if (filesOutOfDate > 0 && filesNew === 0) {
    return (
      <Badge variant="warning" className={className}>
        ⚠ {filesOutOfDate} out-of-date ({totalFiles} total)
      </Badge>
    );
  }

  return (
    <Badge variant="warning" className={className}>
      ⚠ {needsProcessing} need processing ({totalFiles} total)
    </Badge>
  );
}
