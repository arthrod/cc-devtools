/**
 * Decision tree loading and walking logic
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

import { load as parseYaml } from 'js-yaml';

import type {
  DecisionTreeNode,
  StateVariables,
  Option,
  WorkflowResult,
  ParsedDecisionTree,
  WorkflowLogger,
} from '../types/workflow.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Safely evaluate JavaScript conditions from YAML
 * Uses vm module for sandboxed execution
 */
export function safeEval(condition: string, context: StateVariables, logger?: WorkflowLogger): boolean {
  try {
    const script = new vm.Script(condition);
    const sandboxContext = vm.createContext({ ...context });
    const result = script.runInContext(sandboxContext) as boolean;
    logger?.debug(`Condition evaluated: ${condition} = ${result}`);
    return result;
  } catch (error) {
    logger?.error(`Failed to evaluate condition: ${condition}`, {
      error: (error as Error).message,
    });
    throw new Error(`Condition evaluation failed: ${condition}\n${(error as Error).message}`);
  }
}

/**
 * Substitute variables in text
 * Replaces {variable} with actual values from stateVars
 */
export function substituteVariables(text: string, stateVars: StateVariables): string {
  if (!text) return text;

  let result = text;

  const matches = text.match(/\{([^}]+)\}/g);
  if (!matches) return result;

  matches.forEach((match) => {
    const varName = match.slice(1, -1);

    const value = stateVars[varName as keyof StateVariables];
    if (value !== undefined && value !== null) {
      result = result.replace(match, String(value));
    }
  });

  return result;
}

/**
 * Generate dynamic options for TODO and BLOCKED stories
 */
export function generateDynamicOptions(stateVars: StateVariables, logger?: WorkflowLogger): Option[] {
  logger?.info('Generating dynamic options for TODO/BLOCKED stories');

  const options: Option[] = [];
  let optionLetter = 'A';

  stateVars.stories_todo.forEach((story) => {
    options.push({
      option: optionLetter,
      description: `Start story ${story.id}: ${story.title}`,
      actionNecessary: `Create feature branch for story ${story.id}`,
    });
    optionLetter = String.fromCharCode(optionLetter.charCodeAt(0) + 1);
  });

  stateVars.stories_blocked.forEach((story) => {
    options.push({
      option: optionLetter,
      description: `Unblock story ${story.id}: ${story.title}`,
      actionNecessary: `Update story ${story.id} status to in_progress`,
    });
    optionLetter = String.fromCharCode(optionLetter.charCodeAt(0) + 1);
  });

  options.push({
    option: optionLetter,
    description: 'Stop for now',
    actionNecessary: "Tell user to say 'Continue working' to resume",
  });

  logger?.info(`Generated ${options.length} dynamic options`);
  return options;
}

/**
 * Find decision by name
 */
function findDecision(decisions: DecisionTreeNode[], name: string): DecisionTreeNode {
  const decision = decisions.find((d) => d.name === name);
  if (!decision) {
    throw new Error(`Decision not found in tree: ${name}`);
  }
  return decision;
}

/**
 * Walk the decision tree and return terminal state
 */
export function walkDecisionTree(
  decisions: DecisionTreeNode[],
  stateVars: StateVariables,
  logger?: WorkflowLogger
): WorkflowResult {
  logger?.info('Walking decision tree');

  let currentDecision = decisions[0];
  let stepCount = 0;
  const maxSteps = 50;

  while (stepCount < maxSteps) {
    stepCount++;
    logger?.debug(`Step ${stepCount}: Evaluating decision "${currentDecision.name}"`);

    const conditionResult = safeEval(currentDecision.condition, stateVars, logger);
    logger?.debug(`Condition result: ${conditionResult}`);

    const branch = conditionResult ? currentDecision.if_true : currentDecision.if_false;

    if (typeof branch !== 'string' && 'state' in branch) {
      logger?.info(`Reached terminal state: ${branch.state}`);

      const result: WorkflowResult = {
        state: branch.state,
        gitState: {
          current_branch: stateVars.git_branch,
          clean: stateVars.git_clean,
          last_commit_is_finalized: stateVars.git_last_commit_is_finalized,
        },
        kanbanState: {},
      };

      if (stateVars.current_story) {
        result.kanbanState.current_item = {
          id: stateVars.current_story.id,
          title: stateVars.current_story.title,
          status: stateVars.current_story.status,
          type: 'story',
        };
      }

      if (stateVars.current_subtask) {
        result.kanbanState.current_item = {
          id: stateVars.current_subtask.id,
          title: stateVars.current_subtask.title,
          status: stateVars.current_subtask.status,
          type: 'subtask',
        };
      }

      if (stateVars.next_subtask) {
        result.kanbanState.next_item = {
          id: stateVars.next_subtask.id,
          title: stateVars.next_subtask.title,
          status: stateVars.next_subtask.status,
          type: 'subtask',
        };
      } else if (stateVars.next_story) {
        result.kanbanState.next_item = {
          id: stateVars.next_story.id,
          title: stateVars.next_story.title,
          status: stateVars.next_story.status,
          type: 'story',
        };
      }

      if (branch.action_type === 'options_dynamic') {
        result.options = generateDynamicOptions(stateVars, logger);
      } else if (branch.action_type === 'options') {
        result.options = branch.options?.map((opt) => ({
          option: opt.option,
          description: substituteVariables(opt.description, stateVars),
          actionNecessary: substituteVariables(opt.action ?? opt.actionNecessary ?? '', stateVars),
        }));
      } else if (branch.action_type === 'action' || branch.action_type === 'suggest') {
        result.actionNecessary = substituteVariables(branch.action ?? '', stateVars);
      } else if (branch.action_type === 'error') {
        result.error = substituteVariables(branch.action ?? '', stateVars);
      }

      if (branch.warning) {
        result.warning = substituteVariables(branch.warning, stateVars);
      }

      return result;
    }

    if (typeof branch === 'string') {
      currentDecision = findDecision(decisions, branch);
    } else {
      throw new Error(
        `Invalid branch type at decision "${currentDecision.name}": expected string, got ${typeof branch}`
      );
    }
  }

  throw new Error(`Decision tree walk exceeded ${maxSteps} steps - possible infinite loop`);
}

/**
 * Load decision tree from YAML file
 */
export function loadDecisionTree(yamlPath?: string, logger?: WorkflowLogger): DecisionTreeNode[] {
  logger?.info('Loading decision tree from YAML');

  if (!yamlPath) {
    const defaultPath = join(process.cwd(), 'cc-devtools', 'workflow', 'decision-tree.yaml');
    if (existsSync(defaultPath)) {
      yamlPath = defaultPath;
    } else {
      const builtinPath = join(__dirname, '..', '..', '..', 'templates', 'workflow', 'decision-tree.yaml');
      yamlPath = builtinPath;
    }
  }

  if (!existsSync(yamlPath)) {
    logger?.error('workflow decision tree YAML not found', { yamlPath });
    throw new Error(`Decision tree file not found: ${yamlPath}`);
  }

  try {
    const yamlContent = readFileSync(yamlPath, 'utf-8');
    const parsed = parseYaml(yamlContent) as ParsedDecisionTree;

    if (!parsed.decisions || !Array.isArray(parsed.decisions)) {
      throw new Error('Invalid YAML structure: missing decisions array');
    }

    logger?.info(`Loaded ${parsed.decisions.length} decisions from YAML`);
    return parsed.decisions;
  } catch (error) {
    logger?.error('Failed to load decision tree', { error: (error as Error).message });
    throw error;
  }
}
