# Start Work on Story or Subtask

Start implementation work on a story or subtask with code quality rules enforced.

## IMPORTANT: Use Kanban CLI Only

**NEVER modify `kanban.yaml` directly.** Always use the kanban CLI commands via `npx cc-devtools kanban <command>`. The CLI ensures data integrity, validation, and proper ID management. Direct YAML edits can corrupt the kanban system.

## Instructions

1. **Prompt user for ID** (or accept as argument if provided)
   - Can be a story ID (e.g., "MVP-001") or subtask ID (e.g., "MVP-001-1")

2. **Get story details**
   ```bash
   npx cc-devtools kanban get <ID> --full
   ```

   **Note:** Using `--full` flag to get complete details including planning_notes, implementation_notes, and relevant_documentation needed for implementation context.

3. **Parse response and validate**

   If `success: false`:
   - Display error and stop

   If story has subtasks and ID is a story:
   - Display: "Error: Story {ID} has subtasks. You must work on individual subtasks."
   - List subtasks and their statuses
   - Tell user: "Run /kanban-start-work {SUBTASK_ID} to start work on a specific subtask"
   - Stop execution

4. **Validate the status move to in_progress**
   ```bash
   npx cc-devtools kanban validate <ID> in_progress
   ```

   If validation fails (valid: false):
   - Display validation error
   - Stop execution

5. **Display summary and confirm**

   **For a story (no subtasks):**
   ```
   READY TO START WORK
   ===================

   Story: {id} | {title}
   Status: {status} → in_progress
   Phase: {phase} | Value: {business_value}

   Description:
   {description}

   {If details:}
   Details:
   {details}

   {If acceptance_criteria:}
   Acceptance Criteria:
   {list each criterion}

   {If relevant_documentation:}
   Relevant Documentation:
   {list each doc}

   {If planning_notes:}
   Planning Notes:
   {planning_notes}

   Ready to begin implementation? [Yes/No]
   ```

   **For a subtask:**
   ```
   READY TO START WORK
   ===================

   Parent Story: {parent_story.id} | {parent_story.title}
   Parent Status: {parent_story.status} → in_progress (if needed)

   Subtask: {id} | {title}
   Status: {status} → in_progress

   Description:
   {description}

   {If details:}
   Details:
   {details}

   {If acceptance_criteria:}
   Acceptance Criteria:
   {list each criterion}

   {If relevant_documentation:}
   Relevant Documentation:
   {list each doc}

   {If dependent_upon:}
   Dependencies: {dependent_upon.join(', ')}

   {If planning_notes:}
   Planning Notes:
   {planning_notes}

   Parent Story Context:
   {parent_story.description}

   {If parent has relevant_documentation:}
   Parent Story Relevant Documentation:
   {list each doc}

   Ready to begin implementation? [Yes/No]
   ```

   - If user says No: "Work session cancelled" and stop
   - If user says Yes: proceed to step 6

6. **Execute the status change(s)**

   If parent story needs to move to in_progress (for subtasks):
   ```bash
   npx cc-devtools kanban move <STORY_ID> in_progress
   ```

   Then move the item itself:
   ```bash
   npx cc-devtools kanban move <ID> in_progress
   ```

   Check for errors after each move.

7. **Display code quality rules**
   ```
   CODE QUALITY RULES
   ==================

   **IMPORTANT Code Quality Rules:**
   - **NEVER use `any`** - use proper TypeScript types. `unknown` can be used but only if the type is truly unknown. Explore code to determine the proper type.
   - **Prefer interfaces over inline types**
   - **Resolve all linting, typechecking, and test errors** before considering work done
   - **No obvious comments** (e.g., "Validate arguments", "Parse JSON"). Comments must explain WHY, not WHAT.
   - Always add debug logging to new features added to the backend. Frontend logging should only be added on demand and removed when no longer debugging.
   - Structured error handling with specific failure modes
   - Validate, sanitize, type-check all inputs
   - No hardcoded credentials - use secure storage
   - Follow KISS, YAGNI, SOLID principles
   - When you propose a change, provide a rationale for why you want to do this
   ```

8. **Provide complete implementation context**

   **For a story (no subtasks):**
   ```
   IMPLEMENTATION CONTEXT
   ======================

   You are now implementing:
   Story {id}: {title}

   Requirements:
   {description}

   {If details:}
   Additional Details:
   {details}

   {If acceptance_criteria:}
   Acceptance Criteria (must all be met):
   {list each criterion with checkboxes}

   {If relevant_documentation:}
   Relevant Documentation:
   {list docs - suggest reading local files first}

   {If planning_notes:}
   Planning Notes:
   {planning_notes}

   {If implementation_notes:}
   Implementation Notes (from previous work if any):
   {implementation_notes}

   Business Value: {business_value}
   {If effort_estimation_hours:}
   Estimated Effort: {effort_estimation_hours} hours

   {If labels:}
   Labels: {labels.join(', ')}
   {If dependent_upon:}
   Dependencies: {dependent_upon.join(', ')}
   ```

   **For a subtask:**
   ```
   IMPLEMENTATION CONTEXT
   ======================

   You are now implementing:
   Subtask {id}: {title}
   (Part of Story {parent_story.id}: {parent_story.title})

   Subtask Requirements:
   {description}

   {If details:}
   Additional Details:
   {details}

   {If acceptance_criteria:}
   Subtask Acceptance Criteria (must all be met):
   {list each criterion with checkboxes}

   {If relevant_documentation:}
   Subtask Relevant Documentation:
   {list docs - suggest reading local files first}

   {If dependent_upon:}
   Subtask Dependencies:
   {list dependencies - note which are complete/incomplete}

   {If planning_notes:}
   Subtask Planning Notes:
   {planning_notes}

   {If implementation_notes:}
   Subtask Implementation Notes (from previous work if any):
   {implementation_notes}

   {If effort_estimation_hours:}
   Estimated Effort: {effort_estimation_hours} hours

   ---
   Parent Story Context:
   {parent_story.description}

   {If parent_story.details:}
   Parent Story Details:
   {parent_story.details}

   {If parent_story.relevant_documentation:}
   Parent Story Relevant Documentation:
   {list docs}

   {If parent_story.acceptance_criteria:}
   Parent Story Acceptance Criteria:
   {list criteria}

   Parent Story Business Value: {parent_story.business_value}
   {If parent_story.labels:}
   Parent Story Labels: {parent_story.labels.join(', ')}
   ```

9. **Begin implementation**
   ```
   BEGIN IMPLEMENTATION
   ====================

   ⚠️  VERY IMPORTANT: You are now working on {ID}

   REMEMBER THIS ID: {ID}

   You MUST remember this ID throughout the entire implementation session.
   When you complete your work, you will need to reference this exact ID to
   update the status with /kanban-move or /kanban-update-progress.

   Please begin implementing {ID}.

   Remember to:
   1. **KEEP {ID} in mind** - you're working on this ID
   2. Follow all code quality rules above
   3. Meet all acceptance criteria
   4. Review relevant documentation before coding
   5. Add implementation notes as you work
   6. When complete, update status with /kanban-move {ID} completed

   What would you like to do first?
   ```

## Error Handling

If any script returns `success: false`:
- Display: "Error: {error}"
- If code is VALIDATION_FAILED, show specific validation issues
- Stop execution

## Notes

- Script validates workflow rules automatically
- Enforces one story in progress, subtasks require parent in progress
- Provides complete context including parent story details for subtasks
- Code quality rules displayed before implementation begins
- User confirmation prevents accidental work session starts
