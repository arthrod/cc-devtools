/**
 * Plan update and task management tests
 * Tests task updates, new task creation, notes, and status changes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { updatePlan } from '../../../src/planner/tools/update.js';
import { savePlan, readPlan } from '../../../src/planner/core/storage.js';
import type { Plan } from '../../../src/planner/core/types.js';

// Mock embeddings to avoid model loading
vi.mock('../../../src/planner/core/embeddings.js', () => ({
  generatePlanEmbedding: vi.fn(async () => [0.1, 0.2, 0.3, 0.4])
}));

// Mock storage for embeddings
vi.mock('../../../src/planner/core/storage.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/planner/core/storage.js')>();
  return {
    ...actual,
    readEmbeddings: vi.fn(() => ({})),
    saveEmbeddings: vi.fn()
  };
});

describe('Plan Updates', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Create temp test directory and switch to it
    originalCwd = process.cwd();
    testDir = join(originalCwd, '.test-planner-update-' + Date.now());
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterEach(() => {
    // Restore original directory and cleanup
    process.chdir(originalCwd);
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    }
  });

  const createTestPlan = (overrides?: Partial<Plan>): Plan => ({
    id: 'test-plan',
    status: 'planning',
    summary: 'Test plan',
    goal: 'Test goal',
    decisions: 'Test decisions',
    implementation_plan: 'Test implementation',
    tasks: [],
    notes: '',
    created_at: 1000,
    updated_at: 1000,
    ...overrides
  });

  describe('Input validation', () => {
    it('should require plan id', async () => {
      await expect(updatePlan({ id: '' })).rejects.toThrow('id is required');
    });

    it('should validate task_updates is array', async () => {
      await expect(updatePlan({
        id: 'test',
        task_updates: 'not an array' as unknown as []
      })).rejects.toThrow('must be an array');
    });

    it('should validate new_tasks is array', async () => {
      await expect(updatePlan({
        id: 'test',
        new_tasks: 'not an array' as unknown as []
      })).rejects.toThrow('must be an array');
    });

    it('should validate add_note is string', async () => {
      await expect(updatePlan({
        id: 'test',
        add_note: 123 as unknown as string
      })).rejects.toThrow('must be a string');
    });

    it('should validate plan_status', async () => {
      await expect(updatePlan({
        id: 'test',
        plan_status: 'invalid' as unknown as 'planning'
      })).rejects.toThrow('must be one of');
    });

    it('should validate task update structure', async () => {
      await expect(updatePlan({
        id: 'test',
        task_updates: [{ index: -1, status: 'pending' }]
      })).rejects.toThrow('valid index');
    });

    it('should validate task update status', async () => {
      await expect(updatePlan({
        id: 'test',
        task_updates: [{ index: 0, status: 'invalid' as unknown as 'pending' }]
      })).rejects.toThrow('must be one of');
    });

    it('should validate new task has summary', async () => {
      await expect(updatePlan({
        id: 'test',
        new_tasks: [{ summary: '', status: 'pending' }]
      })).rejects.toThrow('non-empty summary');
    });

    it('should validate new task status if provided', async () => {
      await expect(updatePlan({
        id: 'test',
        new_tasks: [{ summary: 'Test', status: 'invalid' as unknown as 'pending' }]
      })).rejects.toThrow('must be one of');
    });
  });

  describe('Plan existence', () => {
    it('should return error if plan does not exist', async () => {
      await expect(updatePlan({ id: 'nonexistent' })).rejects.toThrow('not found');
    });
  });

  describe('Task updates', () => {
    it('should update task status', async () => {
      const plan = createTestPlan({
        tasks: [
          { summary: 'Task 1', status: 'pending' },
          { summary: 'Task 2', status: 'pending' }
        ]
      });

      savePlan(plan);

      const result = await updatePlan({
        id: 'test-plan',
        task_updates: [{ index: 0, status: 'completed' }]
      });

      expect(result.success).toBe(true);

      const updated = readPlan('test-plan');
      expect(updated?.tasks[0].status).toBe('completed');
      expect(updated?.tasks[1].status).toBe('pending');
    });

    it('should update multiple tasks', async () => {
      const plan = createTestPlan({
        tasks: [
          { summary: 'Task 1', status: 'pending' },
          { summary: 'Task 2', status: 'pending' },
          { summary: 'Task 3', status: 'pending' }
        ]
      });

      savePlan(plan);

      const result = await updatePlan({
        id: 'test-plan',
        task_updates: [
          { index: 0, status: 'in_progress' },
          { index: 2, status: 'completed' }
        ]
      });

      expect(result.success).toBe(true);

      const updated = readPlan('test-plan');
      expect(updated?.tasks[0].status).toBe('in_progress');
      expect(updated?.tasks[1].status).toBe('pending');
      expect(updated?.tasks[2].status).toBe('completed');
    });

    it('should return error if task index is out of bounds', async () => {
      const plan = createTestPlan({
        tasks: [{ summary: 'Task 1', status: 'pending' }]
      });

      savePlan(plan);

      await expect(updatePlan({
        id: 'test-plan',
        task_updates: [{ index: 5, status: 'completed' }]
      })).rejects.toThrow('out of bounds');
    });
  });

  describe('New tasks', () => {
    it('should add new task', async () => {
      const plan = createTestPlan();
      savePlan(plan);

      const result = await updatePlan({
        id: 'test-plan',
        new_tasks: [{ summary: 'New task', status: 'pending' }]
      });

      expect(result.success).toBe(true);

      const updated = readPlan('test-plan');
      expect(updated?.tasks).toHaveLength(1);
      expect(updated?.tasks[0].summary).toBe('New task');
      expect(updated?.tasks[0].status).toBe('pending');
    });

    it('should add task with details', async () => {
      const plan = createTestPlan();
      savePlan(plan);

      const result = await updatePlan({
        id: 'test-plan',
        new_tasks: [
          {
            summary: 'Task with details',
            details: 'Some detailed description',
            status: 'in_progress'
          }
        ]
      });

      expect(result.success).toBe(true);

      const updated = readPlan('test-plan');
      expect(updated?.tasks[0].summary).toBe('Task with details');
      expect(updated?.tasks[0].details).toBe('Some detailed description');
      expect(updated?.tasks[0].status).toBe('in_progress');
    });

    it('should default new task status to pending', async () => {
      const plan = createTestPlan();
      savePlan(plan);

      const result = await updatePlan({
        id: 'test-plan',
        new_tasks: [{ summary: 'New task' }]
      });

      expect(result.success).toBe(true);

      const updated = readPlan('test-plan');
      expect(updated?.tasks[0].status).toBe('pending');
    });

    it('should add multiple new tasks', async () => {
      const plan = createTestPlan();
      savePlan(plan);

      const result = await updatePlan({
        id: 'test-plan',
        new_tasks: [
          { summary: 'Task 1', status: 'pending' },
          { summary: 'Task 2', status: 'in_progress' },
          { summary: 'Task 3' }
        ]
      });

      expect(result.success).toBe(true);

      const updated = readPlan('test-plan');
      expect(updated?.tasks).toHaveLength(3);
      expect(updated?.tasks[0].summary).toBe('Task 1');
      expect(updated?.tasks[1].summary).toBe('Task 2');
      expect(updated?.tasks[2].summary).toBe('Task 3');
      expect(updated?.tasks[2].status).toBe('pending');
    });

    it('should append to existing tasks', async () => {
      const plan = createTestPlan({
        tasks: [{ summary: 'Existing task', status: 'completed' }]
      });

      savePlan(plan);

      const result = await updatePlan({
        id: 'test-plan',
        new_tasks: [{ summary: 'New task', status: 'pending' }]
      });

      expect(result.success).toBe(true);

      const updated = readPlan('test-plan');
      expect(updated?.tasks).toHaveLength(2);
      expect(updated?.tasks[0].summary).toBe('Existing task');
      expect(updated?.tasks[1].summary).toBe('New task');
    });
  });

  describe('Notes', () => {
    it('should add note to empty notes', async () => {
      const plan = createTestPlan({ notes: '' });
      savePlan(plan);

      const result = await updatePlan({
        id: 'test-plan',
        add_note: 'First note'
      });

      expect(result.success).toBe(true);

      const updated = readPlan('test-plan');
      expect(updated?.notes).toContain('First note');
      expect(updated?.notes).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\]/); // Timestamp format
    });

    it('should append note to existing notes', async () => {
      const plan = createTestPlan({ notes: 'Existing note' });
      savePlan(plan);

      const result = await updatePlan({
        id: 'test-plan',
        add_note: 'New note'
      });

      expect(result.success).toBe(true);

      const updated = readPlan('test-plan');
      expect(updated?.notes).toContain('Existing note');
      expect(updated?.notes).toContain('New note');
    });

    it('should add timestamp to notes', async () => {
      const plan = createTestPlan();
      savePlan(plan);

      const result = await updatePlan({
        id: 'test-plan',
        add_note: 'Timestamped note'
      });

      expect(result.success).toBe(true);

      const updated = readPlan('test-plan');
      expect(updated?.notes).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\]: Timestamped note/);
    });
  });

  describe('Plan status', () => {
    it('should update plan status', async () => {
      const plan = createTestPlan({ status: 'planning' });
      savePlan(plan);

      const result = await updatePlan({
        id: 'test-plan',
        plan_status: 'in_progress'
      });

      expect(result.success).toBe(true);

      const updated = readPlan('test-plan');
      expect(updated?.status).toBe('in_progress');
    });

    it('should allow all valid statuses', async () => {
      const statuses: Array<'planning' | 'in_progress' | 'completed' | 'on_hold' | 'abandoned'> = [
        'planning',
        'in_progress',
        'completed',
        'on_hold',
        'abandoned'
      ];

      for (const status of statuses) {
        const plan = createTestPlan({ id: `plan-${status}`, status: 'planning' });
        savePlan(plan);

        const result = await updatePlan({
          id: `plan-${status}`,
          plan_status: status
        });

        expect(result.success).toBe(true);

        const updated = readPlan(`plan-${status}`);
        expect(updated?.status).toBe(status);
      }
    });
  });

  describe('Updated timestamp', () => {
    it('should update the updated_at timestamp', async () => {
      const plan = createTestPlan({ updated_at: 1000 });
      savePlan(plan);

      const before = Date.now();

      const result = await updatePlan({
        id: 'test-plan',
        add_note: 'Update'
      });

      const after = Date.now();

      expect(result.success).toBe(true);

      const updated = readPlan('test-plan');
      expect(updated?.updated_at).toBeGreaterThanOrEqual(before);
      expect(updated?.updated_at).toBeLessThanOrEqual(after);
    });
  });

  describe('Combined updates', () => {
    it('should handle multiple update types at once', async () => {
      const plan = createTestPlan({
        tasks: [{ summary: 'Task 1', status: 'pending' }],
        notes: 'Initial notes'
      });

      savePlan(plan);

      const result = await updatePlan({
        id: 'test-plan',
        task_updates: [{ index: 0, status: 'completed' }],
        new_tasks: [{ summary: 'New task', status: 'pending' }],
        add_note: 'Added a task and completed one',
        plan_status: 'in_progress'
      });

      expect(result.success).toBe(true);

      const updated = readPlan('test-plan');
      expect(updated?.tasks).toHaveLength(2);
      expect(updated?.tasks[0].status).toBe('completed');
      expect(updated?.tasks[1].summary).toBe('New task');
      expect(updated?.notes).toContain('Added a task and completed one');
      expect(updated?.status).toBe('in_progress');
    });

    it('should succeed with no updates (just timestamp change)', async () => {
      const plan = createTestPlan();
      savePlan(plan);

      const result = await updatePlan({ id: 'test-plan' });

      expect(result.success).toBe(true);
    });
  });
});
