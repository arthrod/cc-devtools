/**
 * Review prompt generation
 */

import fs from 'fs';
import path from 'path';

import type { ReviewPromptContext } from '../types/review.js';

/**
 * Get the path to the review prompt template
 */
function getReviewPromptTemplatePath(): string {
  const workflowDir = path.join(process.cwd(), 'cc-devtools', 'workflow');
  return path.join(workflowDir, 'review-prompt.md');
}

/**
 * Get the path to a round guidance template
 */
function getRoundGuidanceTemplatePath(roundNumber: number): string {
  const workflowDir = path.join(process.cwd(), 'cc-devtools', 'workflow');

  if (roundNumber === 1) {
    return path.join(workflowDir, 'round-1-guidance.md');
  }

  if (roundNumber === 2) {
    return path.join(workflowDir, 'round-2-guidance.md');
  }

  return path.join(workflowDir, 'round-3-plus-guidance.md');
}

/**
 * Read and process the review prompt template
 */
function readReviewPromptTemplate(): string {
  const templatePath = getReviewPromptTemplatePath();

  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Review prompt template not found at ${templatePath}.\n` +
      'Run "npx cc-devtools setup" to create the default template.'
    );
  }

  return fs.readFileSync(templatePath, 'utf-8');
}

/**
 * Replace template variables in the prompt
 */
function replaceTemplateVariables(template: string, context: ReviewPromptContext): string {
  const { storyId, storyTitle, roundNumber, gitBranch } = context;
  const roundGuidance = getRoundGuidance(roundNumber);

  return template
    .replace(/\{\{storyId\}\}/g, storyId)
    .replace(/\{\{storyTitle\}\}/g, storyTitle)
    .replace(/\{\{roundNumber\}\}/g, String(roundNumber))
    .replace(/\{\{gitBranch\}\}/g, gitBranch)
    .replace(/\{\{roundGuidance\}\}/g, roundGuidance);
}

/**
 * Generate review prompt for a story
 */
export function generateReviewPrompt(context: ReviewPromptContext): string {
  const template = readReviewPromptTemplate();
  return replaceTemplateVariables(template, context);
}

/**
 * Get round-specific guidance from template file
 */
function getRoundGuidance(roundNumber: number): string {
  const templatePath = getRoundGuidanceTemplatePath(roundNumber);

  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Round guidance template not found at ${templatePath}.\n` +
      'Run "npx cc-devtools setup" to create the default templates.'
    );
  }

  let template = fs.readFileSync(templatePath, 'utf-8');

  // Replace {{roundNumber}} placeholders in round 3+ template
  if (roundNumber >= 3) {
    template = template.replace(/\{\{roundNumber\}\}/g, String(roundNumber));
  }

  return template;
}
