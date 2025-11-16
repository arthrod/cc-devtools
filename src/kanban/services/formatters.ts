import type {
  Story,
  Subtask,
  SubtaskStatus,
  FormattedStoryCard,
  FormattedSubtask,
  Progress,
  OutputMode
} from '../types.js';

/**
 * Format a story for display
 * @param story - Story object
 * @returns Formatted story card
 */
export function formatStoryCard(story: Story): FormattedStoryCard {
  const progress = calculateProgress(story.subtasks ?? []);

  return {
    id: story.id,
    title: story.title,
    value: story.business_value,
    status: story.status,
    phase: story.phase,
    effort: story.effort_estimation_hours,
    labels: story.labels ?? [],
    progress,
    hasSubtasks: (story.subtasks ?? []).length > 0,
    dependsOn: story.dependent_upon ?? [],
    completedAt: story.completion_timestamp
  };
}

/**
 * Format subtasks for display
 * @param subtasks - Array of subtasks
 * @returns Formatted subtasks
 */
export function formatSubtaskList(subtasks: Subtask[]): FormattedSubtask[] {
  if (!subtasks || subtasks.length === 0) {
    return [];
  }

  return subtasks.map(st => ({
    id: st.id,
    title: st.title,
    status: st.status,
    effort: st.effort_estimation_hours,
    dependsOn: st.dependent_upon ?? [],
    completedAt: st.completion_timestamp,
    statusIcon: getStatusIcon(st.status)
  }));
}

/**
 * Calculate progress from subtasks
 * @param subtasks - Array of subtasks
 * @returns Progress information
 */
export function calculateProgress(subtasks: Subtask[]): Progress {
  if (!subtasks || subtasks.length === 0) {
    return { completed: 0, total: 0, percentage: 0, dots: '' };
  }

  const completed = subtasks.filter(st => st.status === 'done').length;
  const total = subtasks.length;
  const percentage = Math.round((completed / total) * 100);
  const dots = generateProgressDots(completed, total);

  return { completed, total, percentage, dots };
}

/**
 * Truncate title to fit max length
 * @param title - Title to truncate
 * @param maxLength - Maximum length
 * @returns Truncated title
 */
export function truncateTitle(title: string, maxLength: number): string {
  if (title.length <= maxLength) {
    return title;
  }

  // Try to break at word boundary
  const truncated = title.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.6) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Format ISO timestamp for display
 * @param isoString - ISO 8601 timestamp
 * @returns Readable date
 */
export function formatTimestamp(isoString: string | undefined): string {
  if (!isoString) return '';

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return date.toISOString().split('T')[0];
}

/**
 * Generate progress dots (●●●○○)
 * @param completed - Completed count
 * @param total - Total count
 * @returns Progress dots
 */
export function generateProgressDots(completed: number, total: number): string {
  if (total === 0) return '';

  // If more than 8, use summary format
  if (total > 8) {
    return `${completed}/${total}`;
  }

  const filled = '●'.repeat(completed);
  const empty = '○'.repeat(total - completed);

  return filled + empty;
}

/**
 * Get status icon for subtask
 * @param status - Subtask status
 * @returns Status icon
 */
export function getStatusIcon(status: SubtaskStatus): string {
  const icons: Record<string, string> = {
    done: '✓',
    in_progress: '→',
    todo: '○',
    blocked: '✗'
  };

  return icons[status] || '?';
}

/**
 * Format effort hours for display
 * @param hours - Effort in hours
 * @returns Formatted effort
 */
export function formatEffort(hours: number | undefined): string {
  if (!hours || hours === 0) return '';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours === 1) return '1h';
  return `${hours}h`;
}

/**
 * Get days since timestamp
 * @param isoString - ISO 8601 timestamp
 * @returns Days since timestamp
 */
export function getDaysSince(isoString: string | undefined): number | null {
  if (!isoString) return null;

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Format story for output based on mode
 * @param story - Story object
 * @param mode - Output mode (condensed omits verbose fields)
 * @returns Formatted story for output
 */
export function formatStoryOutput(story: Story, mode: OutputMode = 'condensed'): Record<string, unknown> {
  const base = {
    id: story.id,
    title: story.title,
    status: story.status,
    business_value: story.business_value,
    phase: story.phase,
    subtasks_count: story.subtasks?.length ?? 0,
    effort_estimation_hours: story.effort_estimation_hours,
    labels: story.labels ?? [],
    dependent_upon: story.dependent_upon ?? [],
    acceptance_criteria: story.acceptance_criteria ?? [],
  };

  if (mode === 'full') {
    return {
      ...base,
      description: story.description,
      details: story.details,
      planning_notes: story.planning_notes,
      implementation_notes: story.implementation_notes,
      relevant_documentation: story.relevant_documentation ?? [],
      completion_timestamp: story.completion_timestamp,
      updated_at: story.updated_at,
    };
  }

  return base;
}

/**
 * Format subtask for output based on mode
 * @param subtask - Subtask object
 * @param mode - Output mode (condensed omits verbose fields)
 * @returns Formatted subtask for output
 */
export function formatSubtaskOutput(subtask: Subtask, mode: OutputMode = 'condensed'): Record<string, unknown> {
  const base = {
    id: subtask.id,
    title: subtask.title,
    description: subtask.description,
    status: subtask.status,
    effort_estimation_hours: subtask.effort_estimation_hours,
    dependent_upon: subtask.dependent_upon ?? [],
    acceptance_criteria: subtask.acceptance_criteria ?? [],
  };

  if (mode === 'full') {
    return {
      ...base,
      details: subtask.details,
      planning_notes: subtask.planning_notes,
      implementation_notes: subtask.implementation_notes,
      relevant_documentation: subtask.relevant_documentation ?? [],
      completion_timestamp: subtask.completion_timestamp,
      updated_at: subtask.updated_at,
    };
  }

  return base;
}

/**
 * Get a specific verbose field from a story or subtask
 * @param item - Story or Subtask object
 * @param fieldName - Name of the field to retrieve
 * @returns Field value or undefined if not found
 */
export function getVerboseField(item: Story | Subtask, fieldName: string): unknown {
  const validFields = [
    'details',
    'planning_notes',
    'implementation_notes',
    'relevant_documentation'
  ];

  if (!validFields.includes(fieldName)) {
    throw new Error(`Invalid field name: ${fieldName}. Valid fields: ${validFields.join(', ')}`);
  }

  return item[fieldName as keyof typeof item];
}
