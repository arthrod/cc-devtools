/**
 * PlanExplorer page component providing plan search, browsing, and management capabilities.
 *
 * Features semantic search across plans with status filtering, real-time updates via SSE,
 * and expandable plan cards with context menu actions.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchPlans, fetchAllPlans } from '../services/plans.service.js';
import { LoadingSpinner } from '../components/shared/LoadingSpinner.js';
import { ErrorMessage } from '../components/shared/ErrorMessage.js';
import { SearchBar } from '../components/shared/SearchBar.js';
import { Select } from '../components/shared/Select.js';
import { Button } from '../components/common/Button.js';
import { VirtualizedPlanList } from '../components/plans/VirtualizedPlanList.js';
import { DeletePlanModal } from '../components/plans/DeletePlanModal.js';
import type { Plan, PlanStatus } from '../../../web/shared/types/plans.js';
import api from '../services/api.service.js';
import { useDebounce } from '../hooks/useDebounce.js';

export const PlanExplorer: React.FC = () => {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedStatus, setSelectedStatus] = useState<PlanStatus | 'all'>('all');
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [deletePlan, setDeletePlan] = useState<Plan | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cursorPositionRef = useRef<number | null>(null);

  // Touch handling: 500ms hold triggers context menu
  const [touchTimeout, setTouchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });

  // Fetch all plans
  const { data: allPlans = [], isLoading, error } = useQuery({
    queryKey: ['plans'],
    queryFn: fetchAllPlans
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      await api.delete(`/plans/${planId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setShowDeleteModal(false);
      setDeletePlan(null);
      setSelectedPlan(null);
    }
  });

  // Filter plans by search query and status (using debounced query)
  const filteredPlans = React.useMemo(() => {
    let plans = allPlans;

    // Filter by status
    if (selectedStatus !== 'all') {
      plans = plans.filter(p => p.status === selectedStatus);
    }

    // Filter by search query (simple text search using debounced query)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      plans = plans.filter(p =>
        p.summary.toLowerCase().includes(query) ||
        p.goal.toLowerCase().includes(query) ||
        p.implementation_plan?.toLowerCase().includes(query) ||
        p.decisions?.toLowerCase().includes(query)
      );
    }

    return plans;
  }, [allPlans, debouncedSearchQuery, selectedStatus]);

  // Preserve cursor position and focus across re-renders
  useEffect(() => {
    const input = searchInputRef.current;
    if (!input) return;

    // Restore focus and cursor if we had saved position
    if (document.activeElement !== input && cursorPositionRef.current !== null) {
      input.focus();
      input.setSelectionRange(cursorPositionRef.current, cursorPositionRef.current);
      cursorPositionRef.current = null;
    }
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    // Save cursor position before state update
    cursorPositionRef.current = e.target.selectionStart;
    setSearchQuery(e.target.value);
  }, []);

  // Note: SSE for real-time updates is handled by the global useSSE hook in App.tsx
  // It listens for 'plan_changed' events and invalidates the ['plans'] query key

  // Context menu handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenuVisible(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setContextMenuVisible(false);
      }
    };

    if (contextMenuVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenuVisible]);

  const handlePlanContextMenu = (e: React.MouseEvent, plan: Plan): void => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPlan(plan);
    setContextMenuPosition({ x: e.pageX, y: e.pageY });
    setContextMenuVisible(true);
  };

  const handleShowDeleteModal = (): void => {
    setContextMenuVisible(false);
    if (selectedPlan) {
      setDeletePlan(selectedPlan);
      setShowDeleteModal(true);
    }
  };

  const handleDeletePlan = (): void => {
    if (deletePlan) {
      deleteMutation.mutate(deletePlan.id);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, plan: Plan): void => {
    const touch = e.touches[0];
    if (touch) {
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
      const timeout = setTimeout(() => {
        const touch = e.touches[0];
        if (touch) {
          setSelectedPlan(plan);
          setContextMenuPosition({ x: touch.pageX, y: touch.pageY });
          setContextMenuVisible(true);
        }
      }, 500);
      setTouchTimeout(timeout);
    }
  };

  const handleTouchEnd = (): void => {
    if (touchTimeout) {
      clearTimeout(touchTimeout);
      setTouchTimeout(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent): void => {
    if (touchTimeout) {
      const touch = e.touches[0];
      if (touch) {
        const deltaX = Math.abs(touch.clientX - touchStartPos.x);
        const deltaY = Math.abs(touch.clientY - touchStartPos.y);
        if (deltaX > 10 || deltaY > 10) {
          clearTimeout(touchTimeout);
          setTouchTimeout(null);
        }
      }
    }
  };

  const togglePlan = (planId: string): void => {
    setExpandedPlanId(prev => prev === planId ? null : planId);
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading plans..." />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Virtualized list - this is the scroll container */}
      <div className="flex-1 min-h-0">
        <VirtualizedPlanList
          plans={filteredPlans}
          expandedPlanId={expandedPlanId}
          onTogglePlan={togglePlan}
          onContextMenu={handlePlanContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          header={
            <>
              {/* Header with Search and Filters */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center gap-4">
                    {/* Search Bar - flex-1 to take available space */}
                    <div className="flex-1 [&_.search-container]:mb-0">
                      <SearchBar
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search plans..."
                        inputRef={searchInputRef}
                      />
                    </div>

                    {/* Status Selector */}
                    <div className="w-64 flex-shrink-0">
                      <Select
                        value={selectedStatus}
                        onChange={(value) => setSelectedStatus(value as PlanStatus | 'all')}
                        options={[
                          { value: 'all', label: 'All' },
                          { value: 'planning', label: 'Planning' },
                          { value: 'in_progress', label: 'In Progress' },
                          { value: 'completed', label: 'Completed' },
                          { value: 'on_hold', label: 'On Hold' },
                          { value: 'abandoned', label: 'Abandoned' }
                        ]}
                        placeholder="Filter by status..."
                      />
                    </div>

                    {/* Results Count */}
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="px-6 pt-6">
                  <div className="max-w-7xl mx-auto">
                    <ErrorMessage
                      message={error instanceof Error ? error.message : 'Failed to load plans'}
                      className="mb-6"
                    />
                  </div>
                </div>
              )}
            </>
          }
        />
      </div>

      {/* Context Menu */}
      {contextMenuVisible && selectedPlan && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[160px]"
          style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
        >
          <Button
            variant="ghost"
            onClick={handleShowDeleteModal}
            className="w-full justify-start text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Plan</span>
          </Button>
        </div>
      )}

      {/* Delete Plan Modal */}
      <DeletePlanModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setShowDeleteModal(false);
            setDeletePlan(null);
            setSelectedPlan(null);
          }
        }}
        onConfirm={handleDeletePlan}
        plan={deletePlan}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
};
