import React, { useState } from 'react';
import { clsx } from 'clsx';

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  badge?: React.ReactNode;
  disabled?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  className?: string;
  tabsClassName?: string;
  contentClassName?: string;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  onTabChange?: (tabId: string) => void;
}

export function Tabs({
  tabs,
  defaultTab,
  className,
  tabsClassName,
  contentClassName,
  variant = 'default',
  size = 'md',
  onTabChange
}: TabsProps): JSX.Element {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? '');

  const handleTabChange = (tabId: string): void => {
    if (tabs.find(tab => tab.id === tabId && !tab.disabled)) {
      setActiveTab(tabId);
      onTabChange?.(tabId);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, tabId: string): void => {
    const currentIndex = tabs.findIndex(tab => tab.id === tabId);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    while (tabs[newIndex]?.disabled && newIndex !== currentIndex) {
      if (event.key === 'ArrowLeft' || event.key === 'End') {
        newIndex = newIndex > 0 ? newIndex - 1 : tabs.length - 1;
      } else {
        newIndex = newIndex < tabs.length - 1 ? newIndex + 1 : 0;
      }
    }

    const targetTab = tabs[newIndex];
    if (targetTab && !targetTab.disabled) {
      handleTabChange(targetTab.id);
    }
  };

  const activeContent = tabs.find(tab => tab.id === activeTab)?.content;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  const getTabClasses = (tab: TabItem, isActive: boolean): string => {
    const baseClasses = clsx(
      'inline-flex items-center justify-center font-medium transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
      sizeClasses[size],
      tab.disabled && 'opacity-50 cursor-not-allowed'
    );

    switch (variant) {
      case 'pills':
        return clsx(
          baseClasses,
          'rounded-full border',
          isActive
            ? 'bg-primary-500 text-white border-primary-500'
            : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-750',
          tab.disabled && 'hover:bg-white dark:hover:bg-neutral-800'
        );
      case 'underline':
        return clsx(
          baseClasses,
          'border-b-2 rounded-none',
          isActive
            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
            : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600',
          tab.disabled && 'hover:text-neutral-500 dark:hover:text-neutral-400 hover:border-transparent'
        );
      default:
        return clsx(
          baseClasses,
          'rounded-lg',
          isActive
            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800',
          tab.disabled && 'hover:text-neutral-500 dark:hover:text-neutral-400 hover:bg-transparent'
        );
    }
  };

  return (
    <div className={clsx('w-full', className)}>
      <div className={clsx(
        'flex space-x-1',
        variant === 'underline' && 'border-b border-neutral-200 dark:border-neutral-700 space-x-8',
        tabsClassName
      )} role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              disabled={tab.disabled}
              className={getTabClasses(tab, isActive)}
              onClick={() => handleTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
            >
              {Icon && (
                <Icon className={clsx('h-4 w-4', tab.label && 'mr-2')} />
              )}
              {tab.label}
              {tab.badge && (
                <span className="ml-2">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        id={`tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className={clsx('mt-4', contentClassName)}
      >
        {activeContent}
      </div>
    </div>
  );
}
