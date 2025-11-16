/**
 * CLI core types
 */

export interface Suggestion {
	match: string;
	distance: number;
	confidence: 'high' | 'medium' | 'low';
}

/**
 * Format specifications for validation error messages
 * These provide TypeScript-like format descriptions for expected inputs
 */

/**
 * Create stories format specification
 */
export const createStoriesFormatSpec = `{
  stories: [
    {
      title: string;                           // Required
      description?: string;
      details?: string;
      phase?: string;                          // Default: "MVP"
      business_value?: "XS" | "S" | "M" | "L" | "XL";
      effort_estimation_hours?: number;
      labels?: string[];
      dependent_upon?: string[];               // Story IDs
      planning_notes?: string;
      acceptance_criteria?: string[];
      relevant_documentation?: string[];
      implementation_notes?: string;
    }
  ]
}`;

/**
 * Create subtasks format specification
 */
export const createSubtasksFormatSpec = `{
  subtasks: [
    {
      title: string;                           // Required
      description?: string;
      details?: string;
      effort_estimation_hours?: number;
      dependent_upon?: string[];               // Subtask IDs
      planning_notes?: string;
      acceptance_criteria?: string[];
      relevant_documentation?: string[];
      implementation_notes?: string;
    }
  ];
  complexityAnalysis?: string;
}`;

/**
 * Add review format specification
 */
export const addReviewFormatSpec = `{
  story: string;                               // Required: Story ID
  round: number;                               // Required: Review round number
  author: string;                              // Required: Reviewer name
  content: string;                             // Required: Review content
}`;
