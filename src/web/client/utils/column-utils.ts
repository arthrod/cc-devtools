/**
 * Transforms column identifiers into human-readable display names for UI consistency.
 * Normalizes various separator formats (dashes, dots, underscores) to spaces with title case.
 *
 * @example
 * formatColumnDisplayName('in-progress') // Returns "In Progress"
 * formatColumnDisplayName('to_do') // Returns "To Do"
 */
export function formatColumnDisplayName(columnId: string): string {
  return columnId
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
