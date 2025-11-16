/**
 * MCP tool argument types for kanban
 */

/**
 * Update work item arguments
 */
export interface UpdateWorkItemArgs {
  item_id: string;
  status: string;
  implementation_notes?: string;
}
