# Update Progress

Update implementation progress, check acceptance criteria, and optionally move to next status.

## IMPORTANT: Use Kanban CLI Only

**NEVER modify `kanban.yaml` directly.** Always use the kanban CLI commands via `npx cc-devtools kanban <command>`. The CLI ensures data integrity, validation, and proper ID management. Direct YAML edits can corrupt the kanban system.

## Instructions

1. **Determine the ID being worked on**
   - Check conversation context for the story/subtask ID the user is currently working on
   - If you're certain of the ID from context, confirm with user: "Updating progress for {ID}. Is this correct?"
   - If you're unsure, ask: "Which story or subtask are you updating? (provide ID)"

2. **Get current details**
   ```bash
   npx cc-devtools kanban get <ID> --full
   ```

   **Note:** Using `--full` flag to get complete details including acceptance_criteria and implementation_notes.

   If `success: false`, display error and stop.

3. **Analyze acceptance criteria status**

   Review the acceptance criteria from `data.item.acceptance_criteria` and determine which have been met based on recent implementation work.

   **For STORY (no subtasks):**
   ```
   ACCEPTANCE CRITERIA STATUS
   ===========================

   Story: {item.id} | {item.title}
   Current Status: {item.status}

   Acceptance Criteria:
   {For each criterion:}
   {met ? '✓' : '○'} {criterion} - {met ? 'MET' : 'NOT YET MET'}

   Progress: {count_met}/{total} criteria met
   ```

   **For SUBTASK:**
   ```
   ACCEPTANCE CRITERIA STATUS
   ===========================

   Subtask: {item.id} | {item.title}
   Current Status: {item.status}

   Subtask Acceptance Criteria:
   {For each criterion in item:}
   {met ? '✓' : '○'} {criterion} - {met ? 'MET' : 'NOT YET MET'}

   Subtask Progress: {count_met}/{total} criteria met

   ---
   Parent Story: {parent.id} | {parent.title}

   Parent Story Acceptance Criteria (for context):
   {For each criterion in parent:}
   {met ? '✓' : '○'} {criterion} - {met ? 'MET' : 'NOT YET MET' : 'DEPENDS ON OTHER SUBTASKS'}

   Parent Story Progress: {count_met}/{total} criteria met
   ```

4. **Generate implementation notes summary**

   Based on the conversation and work done in this session, generate a comprehensive summary:

   ```
   PROPOSED IMPLEMENTATION NOTES
   ==============================

   [PROGRESS UPDATE on {CURRENT_DATE}]:

   Work Completed:
   - {SUMMARY OF WHAT WAS IMPLEMENTED}
   - {KEY CHANGES MADE}
   - {FILES MODIFIED/CREATED}

   Key Implementation Details:
   - {IMPORTANT DECISIONS MADE}
   - {TECHNICAL APPROACH TAKEN}
   - {DEPENDENCIES ADDED (if any)}
   - {CONFIGURATION CHANGES (if any)}
   - {GOTCHAS/IMPORTANT NOTES TO REMEMBER}

   {If applicable:}
   Future Considerations:
   - {THINGS TO CONSIDER FOR FUTURE WORK}
   - {POTENTIAL IMPROVEMENTS}
   - {KNOWN LIMITATIONS}
   ```

   Ask user: "Does this summary accurately capture the implementation? [Yes/No/Edit]"
   - If Yes: Proceed to step 5
   - If No: Ask "What should be changed?" and regenerate
   - If Edit: Ask "What would you like to add or modify?" and update

5. **Update implementation_notes field**

   Append the notes to the existing implementation_notes using the appropriate command:

   **For STORY (no subtasks):**
   ```bash
   npx cc-devtools kanban append-story-field <ID> implementation_notes "<NOTES_FROM_STEP_4>"
   ```

   **For SUBTASK:**
   ```bash
   npx cc-devtools kanban append-subtask-field <ID> implementation_notes "<NOTES_FROM_STEP_4>"
   ```

   The append commands will:
   - Add notes with double newline separator if field already has content
   - Update the updated_at timestamp automatically
   - Return success status and new field length for verification

   If `success: false`, display error and stop.

6. **Suggest next status and ask user**

   **For STORY (no subtasks):**
   - If all acceptance criteria met:
     - Current status `in_progress` → Suggest `review`
     - Current status `review` → Suggest `completed`
   - If some criteria not met:
     - Suggest: Keep as `in_progress`
     - Option: Move to `blocked` if stuck

   ```
   NEXT STATUS
   ===========

   Current: {current_status}
   Acceptance Criteria: {met}/{total} met

   Suggested next status: {suggested_status}

   Would you like to move {ID} to {suggested_status}?

   Options:
   A: Yes, move to {suggested_status}
   B: No, keep as {current_status}
   C: Move to different status (will prompt for status)
   ```

   **For SUBTASK:**
   - If all subtask acceptance criteria met → Suggest `completed`
   - If some criteria not met → Suggest keep as `in_progress` or `blocked`

   ```
   NEXT STATUS
   ===========

   Current: {current_status}
   Subtask Acceptance Criteria: {met}/{total} met

   Suggested next status: {suggested_status}

   Would you like to move {ID} to {suggested_status}?

   Options:
   A: Yes, move to {suggested_status}
   B: No, keep as {current_status}
   C: Move to different status (will prompt for status)
   D: Also check parent story status
   ```

7. **Handle user's status choice**

   **If user selects A (Yes):**
   ```bash
   npx cc-devtools kanban move <ID> <suggested_status>
   ```
   - Parse result and display confirmation

   **If user selects B (No):**
   - Display: "Status unchanged. Progress notes have been saved."
   - Stop execution

   **If user selects C (Different status):**
   - Prompt for desired status
   - Validate and execute:
     ```bash
     npx cc-devtools kanban validate <ID> <new_status>
     # If valid:
     npx cc-devtools kanban move <ID> <new_status>
     ```

   **If user selects D (for subtasks only):**
   - Get parent story details and check all subtasks
   - If all subtasks are `completed`:
     - Display: "All subtasks complete! Suggest moving parent story to `review`"
     - Prompt: "Move {STORY_ID} to review? [Yes/No]"
     - If Yes: `npx cc-devtools kanban move <STORY_ID> review`
   - Otherwise:
     - Display: "Parent story still has incomplete subtasks: {list}"

8. **Display final summary**

   ```
   PROGRESS UPDATE COMPLETE
   ========================

   {ID}: {title}
   Status: {old_status} → {new_status}

   Implementation notes updated: ✓
   Acceptance criteria progress: {met}/{total} met

   {If subtask completed and all siblings complete:}
   Note: All subtasks for {STORY_ID} are now complete!
   Consider moving story to review with /kanban-move {STORY_ID} review

   {If story moved to review or completed:}
   Great work! {ID} is now {status}.

   Next steps:
   - View progress with /kanban-list current
   - See what to work on next with /kanban-next
   - View board with /kanban-board
   ```

## Error Handling

If any script returns `success: false`:
- Display: "Error: {error}"
- Show stack trace for debugging if available

## Notes

- This command is designed to be used during or after an implementation session
- It helps track progress and maintain good implementation notes
- Checks acceptance criteria to guide status decisions
- Enforces workflow rules when changing status
- Provides context about parent story when working on subtasks
- Implementation notes are appended using `append-story-field` or `append-subtask-field` commands to preserve history and reduce response size
- Suggests the most logical next status based on current progress
