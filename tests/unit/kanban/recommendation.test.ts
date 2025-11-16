/**
 * Unit tests for Kanban recommendation engine
 * Tests work item recommendations and prioritization logic
 */

import { describe, it, expect } from 'vitest';
import {
  getNextWorkItem,
  findNextSubtask,
  analyzeProgress,
  suggestStatusChange,
} from '../../../src/kanban/services/recommendation.js';
import type { Story } from '../../../src/kanban/core/types.js';

describe('Kanban Recommendation (Unit)', () => {
  describe('getNextWorkItem', () => {
    it('should return current subtask in progress', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'Story',
          status: 'in_progress',
          phase: 'MVP',
          subtasks: [
            {
              id: 'MVP-001-1',
              title: 'In progress subtask',
              status: 'in_progress',
            },
          ],
        },
      ];

      const recommendation = getNextWorkItem(stories);

      expect(recommendation).not.toBeNull();
      expect(recommendation?.type).toBe('subtask');
      expect(recommendation?.item.id).toBe('MVP-001-1');
      expect(recommendation?.reason).toContain('Currently in progress');
    });

    it('should return story in progress with no subtasks', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'Story',
          status: 'in_progress',
          phase: 'MVP',
        },
      ];

      const recommendation = getNextWorkItem(stories);

      expect(recommendation).not.toBeNull();
      expect(recommendation?.type).toBe('story');
      expect(recommendation?.item.id).toBe('MVP-001');
      expect(recommendation?.reason).toContain('no subtasks');
    });

    it('should recommend next todo subtask when story in progress', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'Story',
          status: 'in_progress',
          phase: 'MVP',
          subtasks: [
            {
              id: 'MVP-001-1',
              title: 'Done subtask',
              status: 'done',
            },
            {
              id: 'MVP-001-2',
              title: 'Todo subtask',
              status: 'todo',
            },
          ],
        },
      ];

      const recommendation = getNextWorkItem(stories);

      expect(recommendation).not.toBeNull();
      expect(recommendation?.type).toBe('subtask');
      expect(recommendation?.item.id).toBe('MVP-001-2');
      expect(recommendation?.reason).toContain('Next todo subtask');
    });

    it('should suggest moving to review when all subtasks complete', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'Story',
          status: 'in_progress',
          phase: 'MVP',
          subtasks: [
            {
              id: 'MVP-001-1',
              title: 'Done subtask 1',
              status: 'done',
            },
            {
              id: 'MVP-001-2',
              title: 'Done subtask 2',
              status: 'done',
            },
          ],
        },
      ];

      const recommendation = getNextWorkItem(stories);

      expect(recommendation).not.toBeNull();
      expect(recommendation?.type).toBe('story');
      expect(recommendation?.suggestion).toBe('Move to review');
      expect(recommendation?.reason).toContain('All subtasks complete');
    });

    it('should handle blocked subtasks', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'Story',
          status: 'in_progress',
          phase: 'MVP',
          subtasks: [
            {
              id: 'MVP-001-1',
              title: 'Blocking subtask',
              status: 'todo',
            },
            {
              id: 'MVP-001-2',
              title: 'Blocked subtask',
              status: 'todo',
              dependent_upon: ['MVP-001-1'],
            },
          ],
        },
      ];

      const recommendation = getNextWorkItem(stories);

      expect(recommendation).not.toBeNull();
      expect(recommendation?.type).toBe('subtask');
      expect(recommendation?.item.id).toBe('MVP-001-1');
    });

    it('should recommend next story when no current work', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'High priority todo',
          status: 'todo',
          phase: 'MVP',
          business_value: 'XL',
        },
        {
          id: 'MVP-002',
          title: 'Low priority todo',
          status: 'todo',
          phase: 'MVP',
          business_value: 'S',
        },
      ];

      const recommendation = getNextWorkItem(stories);

      expect(recommendation).not.toBeNull();
      expect(recommendation?.type).toBe('story');
      expect(recommendation?.item.id).toBe('MVP-001');
      expect(recommendation?.reason).toContain('Recommended next story');
    });

    it('should return null when no work available', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'Done story',
          status: 'done',
          phase: 'MVP',
        },
      ];

      const recommendation = getNextWorkItem(stories);

      expect(recommendation).toBeNull();
    });

    it('should prioritize current in_progress over new work', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'High priority todo',
          status: 'todo',
          phase: 'MVP',
          business_value: 'XL',
        },
        {
          id: 'MVP-002',
          title: 'Low priority in progress',
          status: 'in_progress',
          phase: 'MVP',
          business_value: 'XS',
        },
      ];

      const recommendation = getNextWorkItem(stories);

      expect(recommendation).not.toBeNull();
      expect(recommendation?.item.id).toBe('MVP-002');
    });
  });

  describe('findNextSubtask', () => {
    it('should find first todo subtask without dependencies', () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story',
        status: 'in_progress',
        phase: 'MVP',
        subtasks: [
          {
            id: 'MVP-001-1',
            title: 'Done',
            status: 'done',
          },
          {
            id: 'MVP-001-2',
            title: 'Next todo',
            status: 'todo',
          },
          {
            id: 'MVP-001-3',
            title: 'Another todo',
            status: 'todo',
          },
        ],
      };

      const subtask = findNextSubtask(story);

      expect(subtask).not.toBeNull();
      expect(subtask?.id).toBe('MVP-001-2');
    });

    it('should skip blocked subtasks', () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story',
        status: 'in_progress',
        phase: 'MVP',
        subtasks: [
          {
            id: 'MVP-001-1',
            title: 'Blocker',
            status: 'todo',
          },
          {
            id: 'MVP-001-2',
            title: 'Blocked',
            status: 'todo',
            dependent_upon: ['MVP-001-1'],
          },
          {
            id: 'MVP-001-3',
            title: 'Available',
            status: 'todo',
          },
        ],
      };

      const subtask = findNextSubtask(story);

      expect(subtask).not.toBeNull();
      expect(subtask?.id).toBe('MVP-001-1');
    });

    it('should return null when all subtasks complete', () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story',
        status: 'in_progress',
        phase: 'MVP',
        subtasks: [
          {
            id: 'MVP-001-1',
            title: 'Done 1',
            status: 'done',
          },
          {
            id: 'MVP-001-2',
            title: 'Done 2',
            status: 'done',
          },
        ],
      };

      const subtask = findNextSubtask(story);

      expect(subtask).toBeNull();
    });

    it('should return null when no subtasks', () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story',
        status: 'in_progress',
        phase: 'MVP',
      };

      const subtask = findNextSubtask(story);

      expect(subtask).toBeNull();
    });

    it('should handle subtask with met dependencies', () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story',
        status: 'in_progress',
        phase: 'MVP',
        subtasks: [
          {
            id: 'MVP-001-1',
            title: 'Done dependency',
            status: 'done',
          },
          {
            id: 'MVP-001-2',
            title: 'Ready dependent',
            status: 'todo',
            dependent_upon: ['MVP-001-1'],
          },
        ],
      };

      const subtask = findNextSubtask(story);

      expect(subtask).not.toBeNull();
      expect(subtask?.id).toBe('MVP-001-2');
    });
  });

  describe('analyzeProgress', () => {
    it('should analyze story without subtasks', () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Simple story',
        status: 'in_progress',
        phase: 'MVP',
      };

      const analysis = analyzeProgress(story);

      expect(analysis.hasSubtasks).toBe(false);
      expect(analysis.complete).toBe(0);
      expect(analysis.total).toBe(0);
      expect(analysis.percentage).toBe(0);
    });

    it('should calculate subtask completion', () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story with subtasks',
        status: 'in_progress',
        phase: 'MVP',
        subtasks: [
          {
            id: 'MVP-001-1',
            title: 'Done',
            status: 'done',
          },
          {
            id: 'MVP-001-2',
            title: 'Done',
            status: 'done',
          },
          {
            id: 'MVP-001-3',
            title: 'Todo',
            status: 'todo',
          },
        ],
      };

      const analysis = analyzeProgress(story);

      expect(analysis.hasSubtasks).toBe(true);
      expect(analysis.complete).toBe(2);
      expect(analysis.total).toBe(3);
      expect(analysis.percentage).toBe(67);
    });

    it('should identify next subtask', () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story',
        status: 'in_progress',
        phase: 'MVP',
        subtasks: [
          {
            id: 'MVP-001-1',
            title: 'Done',
            status: 'done',
          },
          {
            id: 'MVP-001-2',
            title: 'Next',
            status: 'todo',
          },
        ],
      };

      const analysis = analyzeProgress(story);

      expect(analysis.nextSubtask).not.toBeNull();
      expect(analysis.nextSubtask?.id).toBe('MVP-001-2');
    });
  });

  describe('suggestStatusChange', () => {
    it('should suggest progress for todo subtask', () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story',
        status: 'in_progress',
        phase: 'MVP',
        subtasks: [
          {
            id: 'MVP-001-1',
            title: 'Subtask',
            status: 'todo',
          },
        ],
      };

      const suggestion = suggestStatusChange(story.subtasks![0], 'subtask');

      expect(suggestion.suggested).toBe('in_progress');
      expect(suggestion.reason).toContain('Start work');
    });

    it('should suggest done for in_progress subtask', () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story',
        status: 'in_progress',
        phase: 'MVP',
        subtasks: [
          {
            id: 'MVP-001-1',
            title: 'Subtask',
            status: 'in_progress',
          },
        ],
      };

      const suggestion = suggestStatusChange(story.subtasks![0], 'subtask');

      expect(suggestion.suggested).toBe('done');
      expect(suggestion.reason).toContain('Complete');
    });

    it('should suggest progress for todo story', () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story',
        status: 'todo',
        phase: 'MVP',
      };

      const suggestion = suggestStatusChange(story, 'story');

      expect(suggestion.suggested).toBe('in_progress');
    });

    it('should suggest review when all subtasks complete', () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story',
        status: 'in_progress',
        phase: 'MVP',
        subtasks: [
          {
            id: 'MVP-001-1',
            title: 'Done',
            status: 'done',
          },
        ],
      };

      const suggestion = suggestStatusChange(story, 'story');

      expect(suggestion.suggested).toBe('in_review');
      expect(suggestion.reason).toContain('All subtasks complete');
    });
  });
});
