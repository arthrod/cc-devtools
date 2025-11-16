/**
 * Unit tests for Kanban query functions
 * Tests filtering, grouping, and finding work
 */

import { describe, it, expect } from 'vitest';
import {
  filterStories,
  findCurrentWork,
  findNextRecommendation,
  groupByStatus,
  groupByPhase,
  sortByPriority,
} from '../../../src/kanban/services/query.js';
import type { Story, FilterCriteria } from '../../../src/kanban/core/types.js';

describe('Kanban Query (Unit)', () => {
  const sampleStories: Story[] = [
    {
      id: 'MVP-001',
      title: 'First MVP Story',
      status: 'done',
      phase: 'MVP',
      business_value: 'XL',
      labels: ['backend', 'critical'],
    },
    {
      id: 'MVP-002',
      title: 'Second MVP Story',
      status: 'in_progress',
      phase: 'MVP',
      business_value: 'L',
      effort_estimation_hours: 8,
      subtasks: [
        {
          id: 'MVP-002-1',
          title: 'Subtask 1',
          status: 'done',
        },
        {
          id: 'MVP-002-2',
          title: 'Subtask 2',
          status: 'in_progress',
        },
      ],
    },
    {
      id: 'MVP-003',
      title: 'Third MVP Story',
      status: 'todo',
      phase: 'MVP',
      business_value: 'M',
      labels: ['frontend'],
    },
    {
      id: 'BETA-001',
      title: 'First BETA Story',
      status: 'todo',
      phase: 'BETA',
      business_value: 'S',
      effort_estimation_hours: 4,
    },
    {
      id: 'BETA-002',
      title: 'Blocked Story',
      status: 'todo',
      phase: 'BETA',
      dependent_upon: ['MVP-003'],
    },
  ];

  describe('filterStories', () => {
    it('should return all stories with empty criteria', () => {
      const result = filterStories(sampleStories, {});
      expect(result.length).toBe(5);
    });

    it('should filter by status', () => {
      const criteria: FilterCriteria = { status: 'todo' };
      const result = filterStories(sampleStories, criteria);

      expect(result.length).toBe(3);
      expect(result.every(s => s.status === 'todo')).toBe(true);
    });

    it('should filter by phase', () => {
      const criteria: FilterCriteria = { phase: 'MVP' };
      const result = filterStories(sampleStories, criteria);

      expect(result.length).toBe(3);
      expect(result.every(s => s.phase === 'MVP')).toBe(true);
    });

    it('should filter by label', () => {
      const criteria: FilterCriteria = { label: 'backend' };
      const result = filterStories(sampleStories, criteria);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('MVP-001');
    });

    it('should filter by business value', () => {
      const criteria: FilterCriteria = { value: 'L' };
      const result = filterStories(sampleStories, criteria);

      expect(result.length).toBe(1);
      expect(result[0].business_value).toBe('L');
    });

    it('should filter stories with subtasks', () => {
      const criteria: FilterCriteria = { hasSubtasks: true };
      const result = filterStories(sampleStories, criteria);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('MVP-002');
      expect(result[0].subtasks).toBeDefined();
    });

    it('should filter stories without subtasks', () => {
      const criteria: FilterCriteria = { hasSubtasks: false };
      const result = filterStories(sampleStories, criteria);

      expect(result.length).toBe(4);
      expect(result.every(s => !s.subtasks || s.subtasks.length === 0)).toBe(true);
    });

    it('should filter ready stories (no dependencies)', () => {
      const criteria: FilterCriteria = { ready: true };
      const result = filterStories(sampleStories, criteria);

      expect(result.some(s => s.id === 'BETA-002')).toBe(false);
    });

    it('should combine multiple filters', () => {
      const criteria: FilterCriteria = {
        status: 'todo',
        phase: 'MVP',
      };
      const result = filterStories(sampleStories, criteria);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('MVP-003');
    });

    it('should return empty array when no matches', () => {
      const criteria: FilterCriteria = {
        status: 'done',
        phase: 'BETA',
      };
      const result = filterStories(sampleStories, criteria);

      expect(result.length).toBe(0);
    });
  });

  describe('findCurrentWork', () => {
    it('should find in_progress story without subtasks', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'In Progress',
          status: 'in_progress',
          phase: 'MVP',
        },
      ];

      const result = findCurrentWork(stories);

      expect(result).not.toBeNull();
      expect(result?.story.id).toBe('MVP-001');
      expect(result?.subtask).toBeUndefined();
    });

    it('should find in_progress subtask', () => {
      const result = findCurrentWork(sampleStories);

      expect(result).not.toBeNull();
      expect(result?.story.id).toBe('MVP-002');
      expect(result?.subtask).toBeDefined();
      expect(result?.subtask?.id).toBe('MVP-002-2');
    });

    it('should return story when no subtask in progress', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'In Progress',
          status: 'in_progress',
          phase: 'MVP',
          subtasks: [
            {
              id: 'MVP-001-1',
              title: 'Todo subtask',
              status: 'todo',
            },
          ],
        },
      ];

      const result = findCurrentWork(stories);

      expect(result).not.toBeNull();
      expect(result?.story.id).toBe('MVP-001');
      expect(result?.subtask).toBeUndefined();
    });

    it('should return null when no work in progress', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'Todo',
          status: 'todo',
          phase: 'MVP',
        },
      ];

      const result = findCurrentWork(stories);

      expect(result).toBeNull();
    });

    it('should find first in_progress story when multiple exist', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'First in progress',
          status: 'in_progress',
          phase: 'MVP',
        },
        {
          id: 'MVP-002',
          title: 'Second in progress',
          status: 'in_progress',
          phase: 'MVP',
        },
      ];

      const result = findCurrentWork(stories);

      expect(result?.story.id).toBe('MVP-001');
    });
  });

  describe('findNextRecommendation', () => {
    it('should recommend ready todo stories', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'First',
          status: 'todo',
          phase: 'MVP',
        },
        {
          id: 'MVP-002',
          title: 'Second',
          status: 'todo',
          phase: 'MVP',
        },
      ];

      const result = findNextRecommendation(stories, ['MVP']);

      expect(result.length).toBe(2);
      expect(result[0].story.id).toBe('MVP-001');
    });

    it('should sort by story ID (phase then number)', () => {
      const stories: Story[] = [
        {
          id: 'V1-001',
          title: 'V1 Story',
          status: 'todo',
          phase: 'V1',
        },
        {
          id: 'BETA-002',
          title: 'BETA Story 2',
          status: 'todo',
          phase: 'BETA',
        },
        {
          id: 'MVP-003',
          title: 'MVP Story 3',
          status: 'todo',
          phase: 'MVP',
        },
        {
          id: 'BETA-001',
          title: 'BETA Story 1',
          status: 'todo',
          phase: 'BETA',
        },
      ];

      const result = findNextRecommendation(stories, ['V1', 'BETA', 'MVP']);

      // Sorted by phase priority (V1, BETA, MVP) then numerically within phase
      expect(result.map(r => r.story.id)).toEqual([
        'V1-001',
        'BETA-001',
        'BETA-002',
        'MVP-003',
      ]);
    });

    it('should exclude blocked stories', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'Blocker',
          status: 'in_progress',
          phase: 'MVP',
        },
        {
          id: 'MVP-002',
          title: 'Blocked',
          status: 'todo',
          phase: 'MVP',
          dependent_upon: ['MVP-001'],
        },
        {
          id: 'MVP-003',
          title: 'Ready',
          status: 'todo',
          phase: 'MVP',
        },
      ];

      const result = findNextRecommendation(stories, ['MVP']);

      expect(result.length).toBe(1);
      expect(result[0].story.id).toBe('MVP-003');
    });

    it('should include metadata in results', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'Story',
          status: 'todo',
          phase: 'MVP',
          business_value: 'L',
          effort_estimation_hours: 6,
        },
      ];

      const result = findNextRecommendation(stories, ['MVP']);

      expect(result[0]).toHaveProperty('story');
      expect(result[0]).toHaveProperty('score');
      expect(result[0]).toHaveProperty('effort');
      expect(result[0]).toHaveProperty('reasons');
      expect(result[0].effort).toBe(6);
      expect(result[0].reasons.some(r => r.includes('Business value: L'))).toBe(true);
    });

    it('should return empty array when no ready todo stories', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'Done',
          status: 'done',
          phase: 'MVP',
        },
      ];

      const result = findNextRecommendation(stories, ['MVP']);

      expect(result.length).toBe(0);
    });
  });

  describe('groupByStatus', () => {
    it('should group stories by status', () => {
      const result = groupByStatus(sampleStories);

      expect(result.todo.length).toBe(3);
      expect(result.in_progress.length).toBe(1);
      expect(result.in_review.length).toBe(0);
      expect(result.done.length).toBe(1);
    });

    it('should handle empty array', () => {
      const result = groupByStatus([]);

      expect(result.todo).toEqual([]);
      expect(result.in_progress).toEqual([]);
      expect(result.in_review).toEqual([]);
      expect(result.done).toEqual([]);
    });

    it('should maintain story references', () => {
      const result = groupByStatus(sampleStories);

      expect(result.in_progress[0]).toBe(sampleStories[1]);
    });
  });

  describe('groupByPhase', () => {
    it('should group stories by phase', () => {
      const result = groupByPhase(sampleStories);

      expect(result.MVP.length).toBe(3);
      expect(result.BETA.length).toBe(2);
      expect(result.V1).toBeUndefined();
    });

    it('should handle empty array', () => {
      const result = groupByPhase([]);

      expect(Object.keys(result).length).toBe(0);
    });

    it('should create separate arrays for each phase', () => {
      const result = groupByPhase(sampleStories);

      expect(result.MVP[0].phase).toBe('MVP');
      expect(result.BETA[0].phase).toBe('BETA');
    });
  });

  describe('sortByPriority', () => {
    it('should sort by business value descending', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'Low value',
          status: 'todo',
          phase: 'MVP',
          business_value: 'S',
        },
        {
          id: 'MVP-002',
          title: 'High value',
          status: 'todo',
          phase: 'MVP',
          business_value: 'XL',
        },
        {
          id: 'MVP-003',
          title: 'Medium value',
          status: 'todo',
          phase: 'MVP',
          business_value: 'M',
        },
      ];

      const result = sortByPriority(stories);

      expect(result[0].business_value).toBe('XL');
      expect(result[1].business_value).toBe('M');
      expect(result[2].business_value).toBe('S');
    });

    it('should sort by effort ascending when value is same', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'High effort',
          status: 'todo',
          phase: 'MVP',
          business_value: 'L',
          effort_estimation_hours: 20,
        },
        {
          id: 'MVP-002',
          title: 'Low effort',
          status: 'todo',
          phase: 'MVP',
          business_value: 'L',
          effort_estimation_hours: 2,
        },
      ];

      const result = sortByPriority(stories);

      expect(result[0].effort_estimation_hours).toBe(2);
      expect(result[1].effort_estimation_hours).toBe(20);
    });

    it('should handle stories without business value', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'With value',
          status: 'todo',
          phase: 'MVP',
          business_value: 'M',
        },
        {
          id: 'MVP-002',
          title: 'No value',
          status: 'todo',
          phase: 'MVP',
        },
      ];

      const result = sortByPriority(stories);

      expect(result[0].id).toBe('MVP-001');
      expect(result[1].id).toBe('MVP-002');
    });

    it('should not mutate original array', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'First',
          status: 'todo',
          phase: 'MVP',
          business_value: 'S',
        },
        {
          id: 'MVP-002',
          title: 'Second',
          status: 'todo',
          phase: 'MVP',
          business_value: 'XL',
        },
      ];

      const original = [...stories];
      const result = sortByPriority(stories);

      expect(stories).toEqual(original);
      expect(result).not.toBe(stories);
    });
  });
});
