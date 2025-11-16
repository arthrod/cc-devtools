# What to Work On Next

Suggest the current task or next item to work on based on workflow state.

## IMPORTANT: Use Kanban CLI Only

**NEVER modify `kanban.yaml` directly.** Always use the kanban CLI commands via `npx cc-devtools kanban <command>`. The CLI ensures data integrity, validation, and proper ID management. Direct YAML edits can corrupt the kanban system.

## Instructions

1. **Run the kanban next command**
   ```bash
   npx cc-devtools kanban next
   ```

2. **Parse JSON output and check for errors**
   - If `success: false`, display the error message and stop

3. **Display results based on current work status**

   **If `data.hasCurrentWork` is true:**

   **Case A: Working on subtask** (data.current.type === 'subtask'):
   ```
   WHAT TO WORK ON NEXT
   ====================

   Currently working on:
   → {current.subtask.id} | {current.subtask.title}

   Parent Story: {current.story.id} | {current.story.title}
   Status: {current.story.status} | Progress: {current.progress.completed}/{current.progress.total} subtasks completed

   Subtask Details:
   - Description: {current.subtask.description}
   {If effort_estimation_hours:}
   - Effort: {current.subtask.effort_estimation_hours} hours estimated
   - Status: {current.subtask.status}

   {If acceptance_criteria:}
   Acceptance Criteria:
   {list each criterion}

   Next Action:
   {data.suggestion}
   ```

   **Case B: Working on story without subtasks** (data.current.type === 'story'):
   ```
   WHAT TO WORK ON NEXT
   ====================

   Currently working on:
   → {current.story.id} | {current.story.title}

   Status: {current.story.status}
   Business Value: {current.story.business_value}
   {If effort_estimation_hours:}
   Effort: {current.story.effort_estimation_hours} hours estimated

   Description:
   {current.story.description}

   {If acceptance_criteria:}
   Acceptance Criteria:
   {list each criterion}

   This story has no subtasks.

   Next Action:
   {data.suggestion}
   ```

   **Case C: All subtasks complete - ready for review**:
   ```
   WHAT TO WORK ON NEXT
   ====================

   Story in Progress:
   {current.story.id} | {current.story.title}

   All subtasks completed! ({current.progress.total}/{current.progress.total}) ✓

   Subtasks:
   {For each subtask in current.story.subtasks:}
   ✓ {subtask.id}: {subtask.title}

   Next Action:
   {data.suggestion}
   ```

   **If `data.hasCurrentWork` is false:**

   **Case D: No work in progress - recommend next story**:

   If `data.recommended` is null:
   ```
   WHAT TO WORK ON NEXT
   ====================

   No work currently in progress.
   No stories in todo. Use /kanban-list to review all stories.
   ```

   If `data.recommended` exists:
   ```
   WHAT TO WORK ON NEXT
   ====================

   No work currently in progress.

   Recommended Next Story:
   ► {recommended.story.id} [{recommended.story.business_value}] {recommended.story.title}

   Why this story?
   {For each reason in recommended.reasons:}
   - {reason}

   Details:
   - Phase: {recommended.story.phase}
   {If labels:}
   - Labels: {recommended.story.labels.join(', ')}
   {If effort_estimation_hours:}
   - Effort: {recommended.story.effort_estimation_hours} hours
   {If acceptance_criteria:}
   - Acceptance criteria: {recommended.story.acceptance_criteria.length} defined
   {If subtasks:}
   - Has {recommended.story.subtasks.length} subtasks defined

   {If data.alternatives exists and length > 0:}
   ---
   Alternatives:

   {For each alt in data.alternatives (max 3):}
   {index + 2}. {alt.story.id} [{alt.story.value}] {alt.story.title} ({alt.score} points, {alt.story.effort}h)
      {For each reason in alt.reasons:}
      - {reason}

   Next Action:
   {data.suggestion}
   ```

## Error Handling

If the script returns `success: false`:
- Display: "Error: {error}"
- Show stack trace for debugging if available

## Notes

- The script handles all logic for finding current work
- Recommends next story based on business value and effort
- Handles stories with and without subtasks
- Provides context about why a story is recommended
- Shows alternatives for consideration
