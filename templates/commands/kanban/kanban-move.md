# Move Story or Subtask

Move a story or subtask to a new status with validation against workflow rules.

## IMPORTANT: Use Kanban CLI Only

**NEVER modify `kanban.yaml` directly.** Always use the kanban CLI commands via `npx cc-devtools kanban <command>`. The CLI ensures data integrity, validation, and proper ID management. Direct YAML edits can corrupt the kanban system.

## Instructions

1. **Prompt user for ID and new status**
   - **ID** (e.g., "MVP-001" for story or "MVP-001-1" for subtask)
   - **New status**
     - For stories: todo, in_progress, in_review, blocked, done
     - For subtasks: todo, in_progress, blocked, done

2. **First, validate the move**
   ```bash
   npx cc-devtools kanban validate <ID> <newStatus>
   ```

3. **Parse validation result**

   If `success: false`:
   - Display: "Error: {error}"
   - Stop execution

   If `success: true` but `valid: false`:
   - Display validation error with details:
   ```
   Cannot move {id} to {newStatus}:
   {data.error}

   {If blockingStories exists:}
   Blocking stories: {blockingStories.map(s => s.id).join(', ')}

   {If incompleteSubtasks exists:}
   Incomplete subtasks: {incompleteSubtasks.map(s => s.id).join(', ')}

   Validation checks:
   {For each check in data.checks:}
   {check.passed ? '✓' : '✗'} {check.rule}: {check.reason}
   ```
   - Stop execution

4. **If validation passes, prompt for additional context based on status**

   If moving to **blocked**:
   - Prompt: "What is blocking this? (required for stories, optional for subtasks)"
   - Store as --note flag

   If moving from **blocked** to another status:
   - Prompt: "How was this unblocked? (optional)"
   - Store as --note flag

   If moving to **completed**:
   - For stories: "Confirm all acceptance criteria are met? [Yes/No]"
   - For subtasks: "Confirm subtask is complete? [Yes/No]"
   - If No, ask if they still want to proceed

5. **Execute the move**
   ```bash
   npx cc-devtools kanban move <ID> <newStatus> {if note: -- --note="<note>"}
   ```

6. **Parse execution result and display confirmation**

   If `success: false`:
   - Display: "Error: {error}"
   - If code is VALIDATION_FAILED, show validation details
   - Stop execution

   If `success: true`:

   **For story moves:**
   ```
   Story: {data.id} | {updated.story.title}
   Status: {data.oldStatus} → {data.newStatus}

   {If note was added:}
   Note: {note}

   {If data.allSubtasksComplete is true and newStatus is in_progress:}
   ✓ All subtasks complete! Story is ready for review.

   Next suggested action:
   {data.nextSuggestion}
   - {specific command based on status}
   ```

   **For subtask moves:**
   ```
   Subtask: {data.id} | {updated.subtask.title}
   Status: {data.oldStatus} → {data.newStatus}

   Parent Story: {updated.story.id}
   Overall Progress: {calculate from updated.story.subtasks}

   {If note was added:}
   Note: {note}

   {If data.allSubtasksComplete is true:}
   ✓ All subtasks complete!
   Next Action: Move story {updated.story.id} to review with /kanban-move {updated.story.id} review

   {If not all complete:}
   Next Action: {data.nextSuggestion}
   - View next task with /kanban-next
   ```

## Status-based Next Actions

- **todo**: "Start with /kanban-start-work {ID} when ready to work"
- **in_progress**: "Add subtasks with /kanban-add-subtasks or work on existing subtasks"
- **in_review**: "Complete with /kanban-move {ID} done when review is done"
- **blocked**: "Unblock by moving back to in_progress when blocker is resolved"
- **done**: "Story complete! Start next story with /kanban-next"

## Error Handling

The scripts provide detailed error messages:

- **NOT_FOUND**: Story or subtask doesn't exist
- **VALIDATION_FAILED**: Workflow rule violation (with details)
- **INVALID_INPUT**: Bad parameters or invalid status
- **FILE_ERROR**: Problem reading/writing files

Display the error message and suggest corrective action.

## Notes

- Validation happens before execution (fail-fast)
- All workflow rules enforced by scripts
- Timestamps updated automatically
- Notes appended to implementation_notes
- Script handles both stories and subtasks based on ID format
