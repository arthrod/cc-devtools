# Show Story or Subtask Details

Display full details for a specific story or subtask.

## IMPORTANT: Use Kanban CLI Only

**NEVER modify `kanban.yaml` directly.** Always use the kanban CLI commands via `npx cc-devtools kanban <command>`. The CLI ensures data integrity, validation, and proper ID management. Direct YAML edits can corrupt the kanban system.

## Instructions

1. **Prompt user for ID** (or accept as argument if provided)
   - Can be a story ID (e.g., "MVP-001") or subtask ID (e.g., "MVP-001-1")

2. **Run the kanban get command**
   ```bash
   npx cc-devtools kanban get <ID>
   ```

   **Note:** This returns condensed output by default (omits verbose fields). Use `--full` flag to see all fields including details, planning_notes, implementation_notes, and relevant_documentation:
   ```bash
   npx cc-devtools kanban get <ID> --full
   ```

3. **Parse JSON output and check for errors**
   - If `success: false`, display the error message and stop
   - Error format: `{ success: false, error: "message", code: "ERROR_CODE", stack: "..." }`

4. **Display results based on type**

   **If type is "story":**
   ```
   STORY DETAILS
   =============

   {ID} | {title}
   Status: {status} | Phase: {phase} | Value: {business_value}

   Description:
   {description}

   {If details exists:}
   Details:
   {details}

   {If effort_estimation_hours:}
   Effort: {effort_estimation_hours} hours estimated

   {If labels array not empty:}
   Labels: {labels.join(', ')}

   {If dependent_upon array not empty:}
   Dependencies: {dependent_upon.join(', ')}

   {If relevant_documentation array not empty:}
   Relevant Documentation:
   {list each doc with bullet points}

   {If acceptance_criteria array not empty:}
   Acceptance Criteria:
   {list each criterion with bullet points}

   {If planning_notes:}
   Planning Notes:
   {planning_notes}

   {If implementation_notes:}
   Implementation Notes:
   {implementation_notes}

   Timestamps:
   Created: {created_at}
   Updated: {updated_at}
   {If completion_timestamp:}
   Completed: {completion_timestamp}

   {If has subtasks:}
   Progress: {progress.completed}/{progress.total} subtasks completed
   ────────────────────────────────
   {For each subtask in data.subtasks:}
   {statusIcon} {id}: {title} {if effort: (effort h est)} {if dependsOn: (depends: dependsOn.join(', '))}

   {If nextActions array not empty:}
   Next Actions:
   {list each action with - prefix}
   ```

   **If type is "subtask":**
   ```
   SUBTASK DETAILS
   ===============

   Parent Story: {parent.id} | {parent.title}
   Parent Status: {parent.status} | Progress: {parent.progress.completed}/{parent.progress.total} subtasks completed

   ─────────────────────────

   {item.id} | {item.title}
   Status: {item.status}

   Description:
   {item.description}

   {If details:}
   Details:
   {item.details}

   {If effort_estimation_hours:}
   Effort: {effort_estimation_hours} hours estimated

   {If dependent_upon array not empty:}
   Dependencies: {dependent_upon.join(', ')}

   {If relevant_documentation array not empty:}
   Relevant Documentation:
   {list each doc}

   {If acceptance_criteria array not empty:}
   Acceptance Criteria:
   {list each criterion}

   {If planning_notes:}
   Planning Notes:
   {planning_notes}

   {If implementation_notes:}
   Implementation Notes:
   {implementation_notes}

   Timestamps:
   Created: {created_at}
   Updated: {updated_at}
   {If completion_timestamp:}
   Completed: {completion_timestamp}

   {If nextActions array not empty:}
   Next Actions:
   {list each action}
   ```

## Error Handling

If the script returns `success: false`:
- Display: "Error: {error}"
- If code is "NOT_FOUND": Tell user "Run /kanban-list all to see available stories"
- Show stack trace for debugging if available

## Notes

- The script handles all ID parsing and validation
- Returns formatted data ready for display
- All file I/O and data processing handled by the script
