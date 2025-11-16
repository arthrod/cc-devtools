import React from 'react';
import { PageHeader } from './PageHeader';
import { PageContainer } from './PageContainer';
import { clsx } from 'clsx';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageContentProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  stickyHeader?: boolean;
  maxWidth?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  contentPadding?: boolean;
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function PageContent({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  stickyHeader = false,
  maxWidth = '7xl',
  contentPadding = true,
  spacing = 'lg',
  className
}: PageContentProps): JSX.Element {
  const spacingClass = {
    'none': '',
    'sm': 'space-y-4',
    'md': 'space-y-6',
    'lg': 'space-y-8',
    'xl': 'space-y-12'
  }[spacing];

  const contentPaddingClass = stickyHeader ? 'py-6' : 'py-4 sm:py-6';

  return (
    <div className={clsx('min-h-full', className)}>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={breadcrumbs}
        actions={actions}
        sticky={stickyHeader}
      />

      <div className={contentPaddingClass}>
        <PageContainer
          maxWidth={maxWidth}
          padding={contentPadding}
        >
          <div className={spacingClass}>
            {children}
          </div>
        </PageContainer>
      </div>
    </div>
  );
}
