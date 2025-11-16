/**
 * Unit tests for Kanban validation logic
 * Tests business rules and validation without file I/O
 */

import { describe, it, expect } from 'vitest';
import {
  validateStoryMove,
  validateSubtaskMove,
  checkDependenciesMet,
  checkSubtasksComplete,
  checkMaxInProgress,
} from '../../../src/kanban/services/validation.js';
import type { Story, Config } from '../../../src/kanban/core/types.js';

describe('Kanban Validation (Unit)', () => {
  const mockConfig: Config = {
    statuses: {
      story: ['todo', 'in_progress', 'in_review', 'done'],
      subtask: ['todo', 'in_progress', 'done'],
    },
    business_values: ['XS', 'S', 'M', 'L', 'XL'],
    phases: ['MVP', 'BETA', 'POSTRELEASE'],
    default_status: {
      story: 'todo',
      subtask: 'todo',
    },
    workflow_rules: {
      max_stories_in_progress: 1,
      subtasks_require_story_in_progress: true,
      all_subtasks_completed_before_review: true,
    },
  };

  describe('validateStoryMove', () => {
    it('should allow valid status transition', async () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Test Story',
        status: 'todo',
        phase: 'MVP',
      };

      const result = await validateStoryMove('MVP-001', 'in_progress', [story], mockConfig);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid status', async () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Test Story',
        status: 'todo',
        phase: 'MVP',
      };

      const result = await validateStoryMove(
        'MVP-001',
        'invalid_status' as any,
        [story],
        mockConfig
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid status');
    });

    it('should reject story not found', async () => {
      const result = await validateStoryMove('MVP-999', 'in_progress', [], mockConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should enforce max stories in progress rule', async () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'In Progress',
          status: 'in_progress',
          phase: 'MVP',
        },
        {
          id: 'MVP-002',
          title: 'Todo',
          status: 'todo',
          phase: 'MVP',
        },
      ];

      const result = await validateStoryMove('MVP-002', 'in_progress', stories, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('already in progress');
      expect(result.blockingStories).toBeDefined();
      expect(result.blockingStories?.[0].id).toBe('MVP-001');
    });

    it('should allow multiple stories in progress when max > 1', async () => {
      const configMultiple: Config = {
        ...mockConfig,
        workflow_rules: {
          ...mockConfig.workflow_rules,
          max_stories_in_progress: 3,
        },
      };

      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'In Progress 1',
          status: 'in_progress',
          phase: 'MVP',
        },
        {
          id: 'MVP-002',
          title: 'Todo',
          status: 'todo',
          phase: 'MVP',
        },
      ];

      const result = await validateStoryMove('MVP-002', 'in_progress', stories, configMultiple);

      expect(result.valid).toBe(true);
    });

    it('should require all subtasks complete before review', async () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story with Subtasks',
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
      };

      const result = await validateStoryMove('MVP-001', 'in_review', [story], mockConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot move to in_review');
      expect(result.incompleteSubtasks).toBeDefined();
      expect(result.incompleteSubtasks?.length).toBe(1);
      expect(result.incompleteSubtasks?.[0].id).toBe('MVP-001-2');
    });

    it('should allow review when all subtasks complete', async () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story with Subtasks',
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
      };

      const result = await validateStoryMove('MVP-001', 'in_review', [story], mockConfig);

      expect(result.valid).toBe(true);
    });

    it('should require all subtasks complete before done', async () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story with Subtasks',
        status: 'in_review',
        phase: 'MVP',
        subtasks: [
          {
            id: 'MVP-001-1',
            title: 'Done subtask',
            status: 'done',
          },
          {
            id: 'MVP-001-2',
            title: 'In progress subtask',
            status: 'in_progress',
          },
        ],
      };

      const result = await validateStoryMove('MVP-001', 'done', [story], mockConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot complete story');
      expect(result.incompleteSubtasks?.length).toBe(1);
    });

    it('should allow story without subtasks to move to review', async () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story without Subtasks',
        status: 'in_progress',
        phase: 'MVP',
      };

      const result = await validateStoryMove('MVP-001', 'in_review', [story], mockConfig);

      expect(result.valid).toBe(true);
    });
  });

  describe('validateSubtaskMove', () => {
    it('should allow valid subtask status transition', async () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Parent Story',
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

      const result = await validateSubtaskMove(
        'MVP-001-1',
        'in_progress',
        [story],
        mockConfig
      );

      expect(result.valid).toBe(true);
    });

    it('should reject invalid subtask status', async () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Parent Story',
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

      const result = await validateSubtaskMove(
        'MVP-001-1',
        'invalid_status' as any,
        [story],
        mockConfig
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid status');
    });

    it('should reject subtask not found', async () => {
      const result = await validateSubtaskMove('MVP-001-1', 'in_progress', [], mockConfig);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should require parent story in progress', async () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Parent Story',
        status: 'todo',
        phase: 'MVP',
        subtasks: [
          {
            id: 'MVP-001-1',
            title: 'Subtask',
            status: 'todo',
          },
        ],
      };

      const result = await validateSubtaskMove(
        'MVP-001-1',
        'in_progress',
        [story],
        mockConfig
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('parent story must be in_progress');
    });

    it('should allow subtask progress when rule disabled', async () => {
      const configNoRule: Config = {
        ...mockConfig,
        workflow_rules: {
          ...mockConfig.workflow_rules,
          subtasks_require_story_in_progress: false,
        },
      };

      const story: Story = {
        id: 'MVP-001',
        title: 'Parent Story',
        status: 'todo',
        phase: 'MVP',
        subtasks: [
          {
            id: 'MVP-001-1',
            title: 'Subtask',
            status: 'todo',
          },
        ],
      };

      const result = await validateSubtaskMove(
        'MVP-001-1',
        'in_progress',
        [story],
        configNoRule
      );

      expect(result.valid).toBe(true);
    });

    it('should check subtask dependencies', async () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Parent Story',
        status: 'in_progress',
        phase: 'MVP',
        subtasks: [
          {
            id: 'MVP-001-1',
            title: 'Dependency',
            status: 'todo',
          },
          {
            id: 'MVP-001-2',
            title: 'Dependent Subtask',
            status: 'todo',
            dependent_upon: ['MVP-001-1'],
          },
        ],
      };

      const result = await validateSubtaskMove(
        'MVP-001-2',
        'in_progress',
        [story],
        mockConfig
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('dependencies not met');
      expect(result.blockingDependencies).toBeDefined();
      expect(result.blockingDependencies?.length).toBe(1);
    });

    it('should allow subtask when dependencies met', async () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Parent Story',
        status: 'in_progress',
        phase: 'MVP',
        subtasks: [
          {
            id: 'MVP-001-1',
            title: 'Dependency',
            status: 'done',
          },
          {
            id: 'MVP-001-2',
            title: 'Dependent Subtask',
            status: 'todo',
            dependent_upon: ['MVP-001-1'],
          },
        ],
      };

      const result = await validateSubtaskMove(
        'MVP-001-2',
        'in_progress',
        [story],
        mockConfig
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('checkDependenciesMet', () => {
    it('should return met when no dependencies', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'Story',
          status: 'todo',
          phase: 'MVP',
        },
      ];

      const result = checkDependenciesMet(stories[0].id, stories);

      expect(result.met).toBe(true);
      expect(result.blocking.length).toBe(0);
    });

    it('should detect unmet story dependencies', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'Dependency',
          status: 'in_progress',
          phase: 'MVP',
        },
        {
          id: 'MVP-002',
          title: 'Dependent',
          status: 'todo',
          phase: 'MVP',
          dependent_upon: ['MVP-001'],
        },
      ];

      const result = checkDependenciesMet(stories[1].id, stories);

      expect(result.met).toBe(false);
      expect(result.blocking.length).toBe(1);
      expect(result.blocking[0].id).toBe('MVP-001');
    });

    it('should return met when all dependencies done', () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'Dependency 1',
          status: 'done',
          phase: 'MVP',
        },
        {
          id: 'MVP-002',
          title: 'Dependency 2',
          status: 'done',
          phase: 'MVP',
        },
        {
          id: 'MVP-003',
          title: 'Dependent',
          status: 'todo',
          phase: 'MVP',
          dependent_upon: ['MVP-001', 'MVP-002'],
        },
      ];

      const result = checkDependenciesMet(stories[2].id, stories);

      expect(result.met).toBe(true);
    });

    it('should handle missing dependency stories', () => {
      const stories: Story[] = [
        {
          id: 'MVP-002',
          title: 'Dependent',
          status: 'todo',
          phase: 'MVP',
          dependent_upon: ['MVP-001'],
        },
      ];

      const result = checkDependenciesMet(stories[0].id, stories);

      expect(result.met).toBe(false);
      // Should create placeholder for missing dependency
      expect(result.blocking.length).toBe(1);
      expect(result.blocking[0].id).toBe('MVP-001');
    });
  });

  describe('checkSubtasksComplete', () => {
    it('should return complete when no subtasks', () => {
      const story: Story = {
        id: 'MVP-001',
        title: 'Story',
        status: 'in_progress',
        phase: 'MVP',
      };

      const result = checkSubtasksComplete(story);

      expect(result.complete).toBe(true);
      expect(result.incomplete.length).toBe(0);
    });

    it('should detect incomplete subtasks', () => {
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
            title: 'Todo',
            status: 'todo',
          },
          {
            id: 'MVP-001-3',
            title: 'In Progress',
            status: 'in_progress',
          },
        ],
      };

      const result = checkSubtasksComplete(story);

      expect(result.complete).toBe(false);
      expect(result.incomplete.length).toBe(2);
      expect(result.incomplete.map(s => s.id)).toEqual(['MVP-001-2', 'MVP-001-3']);
    });

    it('should return complete when all subtasks done', () => {
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

      const result = checkSubtasksComplete(story);

      expect(result.complete).toBe(true);
      expect(result.incomplete.length).toBe(0);
    });
  });

  describe('checkMaxInProgress', () => {
    it('should return ok when under limit', async () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'In Progress',
          status: 'in_progress',
          phase: 'MVP',
        },
      ];

      const config: Config = {
        ...mockConfig,
        workflow_rules: {
          ...mockConfig.workflow_rules,
          max_stories_in_progress: 2,
        },
      };

      const result = await checkMaxInProgress(stories, config);

      expect(result.violated).toBe(false);
      expect(result.stories.length).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('should return violated when over limit', async () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'In Progress 1',
          status: 'in_progress',
          phase: 'MVP',
        },
        {
          id: 'MVP-002',
          title: 'In Progress 2',
          status: 'in_progress',
          phase: 'MVP',
        },
        {
          id: 'MVP-003',
          title: 'In Progress 3',
          status: 'in_progress',
          phase: 'MVP',
        },
      ];

      const config: Config = {
        ...mockConfig,
        workflow_rules: {
          ...mockConfig.workflow_rules,
          max_stories_in_progress: 2,
        },
      };

      const result = await checkMaxInProgress(stories, config);

      expect(result.violated).toBe(true);
      expect(result.stories.length).toBe(3);
      expect(result.limit).toBe(2);
    });

    it('should only count in_progress stories', async () => {
      const stories: Story[] = [
        {
          id: 'MVP-001',
          title: 'In Progress',
          status: 'in_progress',
          phase: 'MVP',
        },
        {
          id: 'MVP-002',
          title: 'Todo',
          status: 'todo',
          phase: 'MVP',
        },
        {
          id: 'MVP-003',
          title: 'Done',
          status: 'done',
          phase: 'MVP',
        },
      ];

      const result = await checkMaxInProgress(stories, mockConfig);

      expect(result.stories.length).toBe(1);
      expect(result.violated).toBe(false);
    });
  });
});
