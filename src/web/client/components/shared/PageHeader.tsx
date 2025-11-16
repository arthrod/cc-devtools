import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  sticky = false,
  className
}: PageHeaderProps): JSX.Element {
  const headerClass = clsx(
    'bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700',
    sticky && 'sticky top-0 z-30',
    className
  );

  return (
    <div className={headerClass}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          {breadcrumbs.length > 0 && (
            <nav className="mb-4" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2 text-sm text-neutral-500 dark:text-neutral-400">
                <li>
                  <Link
                    to="/"
                    className="flex items-center hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                  >
                    <Home className="h-4 w-4" />
                    <span className="sr-only">Home</span>
                  </Link>
                </li>
                {breadcrumbs.map((item, index) => (
                  <li key={index} className="flex items-center">
                    <ChevronRight className="h-4 w-4 mx-2 text-neutral-400" />
                    {item.href ? (
                      <Link
                        to={item.href}
                        className="hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-neutral-900 dark:text-neutral-100 font-medium">
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 sm:text-3xl">
                {title}
              </h1>
              {description && (
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 sm:text-base max-w-3xl">
                  {description}
                </p>
              )}
            </div>

            {actions && (
              <div className="flex-shrink-0">
                <div className="flex items-center gap-2">
                  {actions}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
