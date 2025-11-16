import React, { useCallback } from 'react';
import { ChevronRight, Home, Folder } from 'lucide-react';

interface BreadcrumbItem {
  name: string;
  path: string;
  isTruncated?: boolean;
}

interface BreadcrumbProps {
  filePath: string;
  onNavigate?: (path: string) => void;
  showHomeIcon?: boolean;
  maxItems?: number;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  filePath,
  onNavigate,
  showHomeIcon = true,
  maxItems = 5,
  className = '',
}) => {
  const generateBreadcrumbItems = useCallback((path: string): BreadcrumbItem[] => {
    if (!path || path === '/') {
      return [{ name: 'Root', path: '/' }];
    }

    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const segments = cleanPath.split('/').filter((segment) => segment.length > 0);

    const items: BreadcrumbItem[] = [{ name: 'Root', path: '/' }];

    let currentPath = '';
    segments.forEach((segment) => {
      currentPath += `/${segment}`;
      items.push({
        name: segment,
        path: currentPath,
      });
    });

    return items;
  }, []);

  const handleItemClick = useCallback(
    (path: string, isFile: boolean) => {
      if (!onNavigate || isFile) return;
      onNavigate(path);
    },
    [onNavigate]
  );

  const breadcrumbItems = generateBreadcrumbItems(filePath);

  const shouldTruncate = breadcrumbItems.length > maxItems;
  const displayItems = shouldTruncate
    ? [
        ...breadcrumbItems.slice(0, 1),
        { name: '...', path: '', isTruncated: true },
        ...breadcrumbItems.slice(-(maxItems - 2)),
      ]
    : breadcrumbItems;

  const getItemIcon = (item: BreadcrumbItem, index: number): JSX.Element | null => {
    if (index === 0 && showHomeIcon) {
      return <Home className="w-4 h-4 text-gray-500" />;
    }

    if (index < displayItems.length - 1 && item.name !== '...') {
      return <Folder className="w-4 h-4 text-gray-500" />;
    }

    return null;
  };

  const getItemContent = (item: BreadcrumbItem, index: number): JSX.Element => {
    const isLast = index === displayItems.length - 1;
    const isClickable = onNavigate && !isLast && item.name !== '...';
    const isTruncated = item.isTruncated;

    const content = (
      <span
        className={`
          flex items-center gap-1 px-2 py-1 rounded transition-colors
          ${isLast ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-400'}
          ${isClickable ? 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white cursor-pointer' : ''}
          ${isTruncated ? 'cursor-default' : ''}
        `}
        onClick={() => !isTruncated && handleItemClick(item.path, isLast)}
        title={isTruncated ? 'Path truncated' : item.path}
      >
        {getItemIcon(item, index)}
        <span className="text-sm font-medium truncate max-w-32">{item.name}</span>
      </span>
    );

    return content;
  };

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav className={`flex items-center space-x-1 text-sm overflow-hidden ${className}`} aria-label="File path breadcrumb">
      {displayItems.map((item, index) => (
        <React.Fragment key={`${item.path}-${index}`}>
          {getItemContent(item, index)}

          {index < displayItems.length - 1 && (
            <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" aria-hidden="true" />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

interface CompactBreadcrumbProps {
  filePath: string;
  className?: string;
}

export const CompactBreadcrumb: React.FC<CompactBreadcrumbProps> = ({ filePath, className = '' }) => {
  const fileName = filePath.split('/').pop() ?? filePath;
  const directory = filePath.substring(0, filePath.lastIndexOf('/')) || '/';

  return (
    <div className={`flex items-center text-sm text-gray-600 dark:text-gray-400 ${className}`}>
      <Folder className="w-4 h-4 mr-1 flex-shrink-0" />
      <span className="truncate" title={directory}>
        {directory}
      </span>
      <ChevronRight className="w-3 h-3 mx-1 flex-shrink-0" />
      <span className="font-medium text-gray-900 dark:text-white" title={fileName}>
        {fileName}
      </span>
    </div>
  );
};
