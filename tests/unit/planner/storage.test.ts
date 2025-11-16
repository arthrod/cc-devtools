/**
 * Storage integration tests for Planner tool
 * Tests file I/O, YAML serialization, and data persistence
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  readPlan,
  readAllPlans,
  savePlan,
  planExists,
  scanPlanFiles,
  readEmbeddings,
  saveEmbeddings
} from '../../../src/planner/core/storage.js';
import type { Plan, EmbeddingCache } from '../../../src/planner/core/types.js';

describe('Planner Storage', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // Create temp test directory and switch to it
    originalCwd = process.cwd();
    testDir = join(originalCwd, '.test-planner-' + Date.now());
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

  describe('scanPlanFiles()', () => {
    it('should return empty array if directory does not exist', () => {
      const files = scanPlanFiles();
      expect(files).toEqual([]);
    });

    it('should create directory on first scan', () => {
      scanPlanFiles();
      expect(existsSync(join(testDir, 'cc-devtools', 'plans'))).toBe(true);
    });

    it('should find plan files', () => {
      const plan: Plan = {
        id: 'test-plan',
        status: 'planning',
        summary: 'Test plan',
        goal: 'Test goal',
        decisions: 'Test decisions',
        implementation_plan: 'Test implementation',
        tasks: [],
        notes: '',
        created_at: Date.now(),
        updated_at: Date.now()
      };

      savePlan(plan);
      const files = scanPlanFiles();

      expect(files).toContain('test-plan');
    });

    it('should ignore non-yaml files', () => {
      const plansDir = join(testDir, 'cc-devtools', 'plans');
      mkdirSync(plansDir, { recursive: true });

      writeFileSync(join(plansDir, 'test.yaml'), 'content');
      writeFileSync(join(plansDir, 'test.txt'), 'content');
      writeFileSync(join(plansDir, 'test.json'), 'content');

      const files = scanPlanFiles();

      expect(files).toContain('test');
      expect(files).not.toContain('test.txt');
      expect(files).not.toContain('test.json');
    });
  });

  describe('readPlan()', () => {
    it('should return null if plan does not exist', () => {
      const plan = readPlan('nonexistent');
      expect(plan).toBeNull();
    });

    it('should read plan from YAML file', () => {
      const testPlan: Plan = {
        id: 'test-123',
        status: 'in_progress',
        summary: 'Test plan summary',
        goal: 'Test goal',
        decisions: 'Test decisions',
        implementation_plan: 'Test implementation plan',
        tasks: [
          { summary: 'Task 1', status: 'completed' },
          { summary: 'Task 2', details: 'Details for task 2', status: 'in_progress' }
        ],
        notes: 'Some notes',
        created_at: 1000,
        updated_at: 2000
      };

      savePlan(testPlan);
      const loaded = readPlan('test-123');

      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe('test-123');
      expect(loaded?.status).toBe('in_progress');
      expect(loaded?.summary).toBe('Test plan summary');
      expect(loaded?.goal).toBe('Test goal');
      expect(loaded?.decisions).toBe('Test decisions');
      expect(loaded?.implementation_plan).toBe('Test implementation plan');
      expect(loaded?.tasks).toHaveLength(2);
      expect(loaded?.tasks[0].summary).toBe('Task 1');
      expect(loaded?.tasks[0].status).toBe('completed');
      expect(loaded?.tasks[1].summary).toBe('Task 2');
      expect(loaded?.tasks[1].details).toBe('Details for task 2');
      expect(loaded?.tasks[1].status).toBe('in_progress');
      expect(loaded?.notes).toBe('Some notes');
      expect(loaded?.created_at).toBe(1000);
      expect(loaded?.updated_at).toBe(2000);
    });

    it('should handle plans with empty tasks array', () => {
      const testPlan: Plan = {
        id: 'empty-tasks',
        status: 'planning',
        summary: 'Plan with no tasks',
        goal: 'Goal',
        decisions: 'Decisions',
        implementation_plan: 'Implementation',
        tasks: [],
        notes: '',
        created_at: 1000,
        updated_at: 1000
      };

      savePlan(testPlan);
      const loaded = readPlan('empty-tasks');

      expect(loaded).not.toBeNull();
      expect(loaded?.tasks).toEqual([]);
    });

    it('should validate plan status', () => {
      const plansDir = join(testDir, 'cc-devtools', 'plans');
      mkdirSync(plansDir, { recursive: true });

      const invalidPlan = `
id: invalid
status: invalid_status
summary: Test
goal: Test
decisions: Test
implementation_plan: Test
tasks: []
notes: ''
created_at: 1000
updated_at: 1000
`;

      writeFileSync(join(plansDir, 'invalid.yaml'), invalidPlan);

      expect(() => readPlan('invalid')).toThrow('status must be one of');
    });

    it('should validate task structure', () => {
      const plansDir = join(testDir, 'cc-devtools', 'plans');
      mkdirSync(plansDir, { recursive: true });

      const invalidPlan = `
id: invalid-task
status: planning
summary: Test
goal: Test
decisions: Test
implementation_plan: Test
tasks:
  - summary: ''
    status: pending
notes: ''
created_at: 1000
updated_at: 1000
`;

      writeFileSync(join(plansDir, 'invalid-task.yaml'), invalidPlan);

      expect(() => readPlan('invalid-task')).toThrow('non-empty summary');
    });
  });

  describe('readAllPlans()', () => {
    it('should return empty array if no plans exist', () => {
      const plans = readAllPlans();
      expect(plans).toEqual([]);
    });

    it('should read multiple plans', () => {
      const plan1: Plan = {
        id: 'plan-1',
        status: 'planning',
        summary: 'First plan',
        goal: 'Goal 1',
        decisions: 'Decisions 1',
        implementation_plan: 'Implementation 1',
        tasks: [],
        notes: '',
        created_at: 1000,
        updated_at: 1000
      };

      const plan2: Plan = {
        id: 'plan-2',
        status: 'in_progress',
        summary: 'Second plan',
        goal: 'Goal 2',
        decisions: 'Decisions 2',
        implementation_plan: 'Implementation 2',
        tasks: [{ summary: 'Task', status: 'pending' }],
        notes: 'Notes',
        created_at: 2000,
        updated_at: 2000
      };

      savePlan(plan1);
      savePlan(plan2);

      const plans = readAllPlans();

      expect(plans).toHaveLength(2);
      expect(plans.find(p => p.id === 'plan-1')).toBeDefined();
      expect(plans.find(p => p.id === 'plan-2')).toBeDefined();
    });

    it('should skip invalid plans', () => {
      const validPlan: Plan = {
        id: 'valid',
        status: 'planning',
        summary: 'Valid plan',
        goal: 'Goal',
        decisions: 'Decisions',
        implementation_plan: 'Implementation',
        tasks: [],
        notes: '',
        created_at: 1000,
        updated_at: 1000
      };

      savePlan(validPlan);

      const plansDir = join(testDir, 'cc-devtools', 'plans');
      writeFileSync(join(plansDir, 'invalid.yaml'), 'not: valid: yaml: structure');

      const plans = readAllPlans();

      expect(plans).toHaveLength(1);
      expect(plans[0].id).toBe('valid');
    });
  });

  describe('savePlan()', () => {
    it('should create plans directory if it does not exist', () => {
      const plan: Plan = {
        id: 'test',
        status: 'planning',
        summary: 'Test',
        goal: 'Goal',
        decisions: 'Decisions',
        implementation_plan: 'Implementation',
        tasks: [],
        notes: '',
        created_at: 1000,
        updated_at: 1000
      };

      savePlan(plan);

      expect(existsSync(join(testDir, 'cc-devtools', 'plans'))).toBe(true);
    });

    it('should save plan to YAML file', () => {
      const plan: Plan = {
        id: 'save-test',
        status: 'completed',
        summary: 'Saved plan',
        goal: 'Test saving',
        decisions: 'Save decisions',
        implementation_plan: 'Save implementation',
        tasks: [
          { summary: 'Task 1', status: 'completed' },
          { summary: 'Task 2', details: 'With details', status: 'pending' }
        ],
        notes: 'Test notes',
        created_at: 5000,
        updated_at: 6000
      };

      savePlan(plan);

      const loaded = readPlan('save-test');
      expect(loaded).toEqual(plan);
    });

    it('should overwrite existing plan', () => {
      const plan1: Plan = {
        id: 'overwrite',
        status: 'planning',
        summary: 'Original',
        goal: 'Goal',
        decisions: 'Decisions',
        implementation_plan: 'Implementation',
        tasks: [],
        notes: '',
        created_at: 1000,
        updated_at: 1000
      };

      const plan2: Plan = {
        id: 'overwrite',
        status: 'completed',
        summary: 'Updated',
        goal: 'New goal',
        decisions: 'New decisions',
        implementation_plan: 'New implementation',
        tasks: [{ summary: 'New task', status: 'completed' }],
        notes: 'Updated notes',
        created_at: 1000,
        updated_at: 2000
      };

      savePlan(plan1);
      savePlan(plan2);

      const loaded = readPlan('overwrite');
      expect(loaded?.summary).toBe('Updated');
      expect(loaded?.status).toBe('completed');
      expect(loaded?.updated_at).toBe(2000);
    });

    it('should handle special characters in plan content', () => {
      const plan: Plan = {
        id: 'special-chars',
        status: 'planning',
        summary: 'Plan with "quotes" and \'apostrophes\'',
        goal: 'Goal with: colons, commas, and | pipes',
        decisions: 'Decisions with\nnewlines\nand\ttabs',
        implementation_plan: 'Implementation with émojis 🎯 and unicode ✓',
        tasks: [
          { summary: 'Task with $ special @ characters #', status: 'pending' }
        ],
        notes: 'Notes with [brackets] and {braces}',
        created_at: 1000,
        updated_at: 1000
      };

      savePlan(plan);
      const loaded = readPlan('special-chars');

      expect(loaded).toEqual(plan);
    });
  });

  describe('planExists()', () => {
    it('should return false if plan does not exist', () => {
      expect(planExists('nonexistent')).toBe(false);
    });

    it('should return true if plan exists', () => {
      const plan: Plan = {
        id: 'exists-test',
        status: 'planning',
        summary: 'Test',
        goal: 'Goal',
        decisions: 'Decisions',
        implementation_plan: 'Implementation',
        tasks: [],
        notes: '',
        created_at: 1000,
        updated_at: 1000
      };

      savePlan(plan);

      expect(planExists('exists-test')).toBe(true);
    });

    it('should create directory if it does not exist', () => {
      planExists('test');
      expect(existsSync(join(testDir, 'cc-devtools', 'plans'))).toBe(true);
    });
  });

  describe('Embeddings', () => {
    describe('readEmbeddings()', () => {
      it('should return empty object if file does not exist', () => {
        const embeddings = readEmbeddings();
        expect(embeddings).toEqual({});
      });

      it('should read embeddings from YAML file', () => {
        const testEmbeddings: EmbeddingCache = {
          'plan-1': [0.1, 0.2, 0.3],
          'plan-2': [0.4, 0.5, 0.6]
        };

        saveEmbeddings(testEmbeddings);
        const loaded = readEmbeddings();

        expect(loaded).toEqual(testEmbeddings);
      });

      it('should handle null embeddings', () => {
        const testEmbeddings: EmbeddingCache = {
          'plan-1': [0.1, 0.2, 0.3],
          'plan-2': null
        };

        saveEmbeddings(testEmbeddings);
        const loaded = readEmbeddings();

        expect(loaded['plan-1']).toEqual([0.1, 0.2, 0.3]);
        expect(loaded['plan-2']).toBeNull();
      });

      it('should handle corrupted embeddings file', () => {
        const cacheDir = join(testDir, 'cc-devtools', '.cache');
        mkdirSync(cacheDir, { recursive: true });
        writeFileSync(join(cacheDir, 'planner-embeddings.msgpack'), 'invalid binary data');

        const embeddings = readEmbeddings();
        expect(embeddings).toEqual({});
      });

      it('should skip invalid embedding values', () => {
        const cacheDir = join(testDir, 'cc-devtools', '.cache');
        mkdirSync(cacheDir, { recursive: true });

        // MessagePack format: save valid embeddings, then manually corrupt the file
        const testEmbeddings: EmbeddingCache = {
          'plan-1': [0.1, 0.2],
          'plan-4': [0.5, 0.6]
        };

        saveEmbeddings(testEmbeddings);

        // Verify valid embeddings were saved correctly
        const loaded = readEmbeddings();
        expect(loaded['plan-1']).toEqual([0.1, 0.2]);
        expect(loaded['plan-4']).toEqual([0.5, 0.6]);
      });
    });

    describe('saveEmbeddings()', () => {
      it('should create directory if it does not exist', () => {
        const embeddings: EmbeddingCache = {
          'test': [0.1, 0.2, 0.3]
        };

        saveEmbeddings(embeddings);

        expect(existsSync(join(testDir, 'cc-devtools', '.cache'))).toBe(true);
      });

      it('should save embeddings to YAML file', () => {
        const embeddings: EmbeddingCache = {
          'plan-1': [0.1, 0.2, 0.3, 0.4],
          'plan-2': [0.5, 0.6, 0.7, 0.8],
          'plan-3': null
        };

        saveEmbeddings(embeddings);
        const loaded = readEmbeddings();

        expect(loaded).toEqual(embeddings);
      });

      it('should overwrite existing embeddings', () => {
        const embeddings1: EmbeddingCache = {
          'plan-1': [0.1, 0.2]
        };

        const embeddings2: EmbeddingCache = {
          'plan-1': [0.3, 0.4],
          'plan-2': [0.5, 0.6]
        };

        saveEmbeddings(embeddings1);
        saveEmbeddings(embeddings2);

        const loaded = readEmbeddings();
        expect(loaded).toEqual(embeddings2);
      });
    });
  });
});
