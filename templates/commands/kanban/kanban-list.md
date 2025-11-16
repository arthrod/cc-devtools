# List Stories

List and filter stories with optional detailed view.

## IMPORTANT: Use Kanban CLI Only

**NEVER modify `kanban.yaml` directly.** Always use the kanban CLI commands via `npx cc-devtools kanban <command>`. The CLI ensures data integrity, validation, and proper ID management. Direct YAML edits can corrupt the kanban system.

## Instructions

1. **Check if any arguments were provided**, otherwise prompt user for filter:
   - **current** - Show current in_progress story with full details
   - **todo** - Show all todo stories
   - **in_progress** - Show all in-progress stories
   - **in_review** - Show all in-review stories
   - **blocked** - Show all blocked stories
   - **done** - Show all done stories
   - **all** - Show all stories
   - **phase:{PHASE}** - Filter by phase (e.g., "phase:MVP")
   - **label:{LABEL}** - Filter by label (e.g., "label:backend")
   - **value:{VALUE}** - Filter by business value (e.g., "value:L")

2. **Build and run the kanban list command**

   For simple filters (status only):
   ```bash
   npx cc-devtools kanban list -- --filter={STATUS}
   ```

   For phase filter:
   ```bash
   npx cc-devtools kanban list -- --phase={PHASE}
   ```

   For label filter:
   ```bash
   npx cc-devtools kanban list -- --label={LABEL}
   ```

   For value filter:
   ```bash
   npx cc-devtools kanban list -- --value={VALUE}
   ```

   For combined filters:
   ```bash
   npx cc-devtools kanban list -- --filter={STATUS} --phase={PHASE} --label={LABEL}
   ```

3. **Parse JSON output and check for errors**
   - If `success: false`, display the error message and stop

4. **Display results based on filter**

   **For "current" filter:**
   If `data.current` is null:
   ```
   No story currently in progress. Use /kanban-move to start a story.
   ```

   If `data.current` exists:
   ```
   CURRENT STORY
   =============

   {current.story.id} | {current.story.title}
   Status: {current.story.status} | Phase: {current.story.phase} | Value: {current.story.business_value}

   Description:
   {current.story.description}

   {If details:}
   Details:
   {current.story.details}

   {If effort_estimation_hours:}
   Effort: {current.story.effort_estimation_hours} hours estimated

   {If labels:}
   Labels: {current.story.labels.join(', ')}

   {If dependent_upon:}
   Dependencies: {current.story.dependent_upon.join(', ')}

   {If acceptance_criteria:}
   Acceptance Criteria:
   {list each criterion with checkmark if appears met, empty circle if not}

   {If planning_notes:}
   Planning Notes:
   {current.story.planning_notes}

   {If implementation_notes:}
   Implementation Notes:
   {current.story.implementation_notes}

   {If has subtasks:}
   Progress: {current.progress.completed}/{current.progress.total} subtasks completed
   ────────────────────────────────
   {For each subtask in current.story.subtasks:}
   {statusIcon} {id}: {title} {if depends: (depends: dependent_upon.join(', '))}

   {If current.subtask exists:}
   Currently working on: {current.subtask.id} | {current.subtask.title}

   Next Actions:
   - Complete current work with /kanban-move
   - View board with /kanban-board
   ```

   **For other filters:**

   If no stories found:
   ```
   No stories found matching filter: {filter description}
   ```

   If stories found, group by status (unless single status filter):
   ```
   STORIES: {filter description}
   {If filtered: ========================}
   {If all:      ALL STORIES}

   {For each status group in data.grouped that has stories:}
   {STATUS_NAME}
   ────
   {For each story in status group:}
   {story.id} [{business_value}] {title}
     {If labels:} Labels: {labels.join(', ')}
     {If subtasks:} Subtasks: {progress.completed}/{progress.total} {progress.dots}
     {If effort:} Effort: {effort_estimation_hours} hours

   ---
   Summary: {data.summary.total} stories total
   {If multiple phases:} | {phase}: {count}, ...
   {If multiple statuses:} | {status}: {count}, ...

   Actions:
   1. View story details with /kanban-detail {ID}
   2. Move story with /kanban-move {ID} {status}
   3. View board with /kanban-board
   ```

## Filter Examples

- `current` → `--filter=current`
- `todo` → `--filter=todo`
- `in_progress` → `--filter=in_progress`
- `in_review` → `--filter=in_review`
- `phase:MVP` → `--phase=MVP`
- `label:backend` → `--label=backend`
- `value:L` → `--value=L`
- `all` → (no filter flags)

## Error Handling

If the script returns `success: false`:
- Display: "Error: {error}"
- Show stack trace for debugging if available

## Notes

- The script handles all filtering logic
- Returns stories grouped by status automatically
- Summary statistics calculated by script
- All file I/O handled by the script
