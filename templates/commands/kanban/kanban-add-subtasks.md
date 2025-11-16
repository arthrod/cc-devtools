# Add Subtasks

Interactive session to add one or more subtasks to a story, either manually or through automatic breakdown.

**Note**: The `create-subtasks` command supports bulk creation - it can create a single subtask or multiple subtasks in one operation.

## IMPORTANT: Use Kanban CLI Only

**NEVER modify `kanban.yaml` directly.** Always use the kanban CLI commands via `npx cc-devtools kanban <command>`. The CLI ensures data integrity, validation, and proper ID management. Direct YAML edits can corrupt the kanban system.

## Instructions

1. **Determine which story to add subtasks to**

   Ask: "Which story would you like to add subtasks to? Please provide:
   - Story ID (e.g., MVP-001)
   - Or 'current' to use the story currently in progress

   Alternatively, describe what you want to break down and I'll help identify the right story."

2. **Retrieve and display the story**

   If user says 'current':
   ```bash
   npx cc-devtools kanban list -- --filter=current
   ```
   Extract story ID from `data.current.story.id`

   Otherwise use provided ID:
   ```bash
   npx cc-devtools kanban get <ID> --full
   ```

   **Note:** Using `--full` flag to get complete story details including planning_notes and relevant_documentation.

   If `success: false` or story not found, display error and stop.

   Display the story:
   ```
   STORY: {item.id} | {item.title}
   Status: {item.status}
   Business Value: {item.business_value}
   Estimated Effort: {item.effort_estimation_hours} hours

   Description: {item.description}

   {If details:}
   Details: {item.details}

   Existing Subtasks: {subtasks.length or "none"}
   {If subtasks, list each with status}
   ```

3. **Determine approach: Manual or Automatic breakdown**

   Ask: "How would you like to add subtasks?

   A. Add specific subtasks manually (I'll ask for details for each)
   B. Automatically break down this story into subtasks (I'll analyze and propose a breakdown)
   C. Replace all existing subtasks with new automatic breakdown
   D. Cancel

   What would you like to do?"

4. **Handle user's choice**

   **If A (Manual addition):**
   - Proceed to step 5 (Manual subtask creation)

   **If B (Automatic breakdown - keep existing):**
   - Proceed to step 6 (Automatic breakdown analysis)
   - Will append new subtasks to existing ones

   **If C (Replace existing):**
   - If story has existing subtasks, show warning: "This will remove {X} existing subtasks. Are you sure? [Yes/No]"
   - If Yes: Claude will handle removing existing subtasks
   - Proceed to step 6 (Automatic breakdown analysis)

   **If D (Cancel):**
   - Display: "Subtask creation cancelled"
   - Stop execution

5. **Manual subtask creation process**

   For each subtask (ask user if they want to add more after each one):

   Prompt for:
   - **Title** (required)
   - **Description** (required)
   - **Details** (optional - specific technical implementation guidance)
   - **Effort estimation hours** (optional)
   - **Relevant documentation** (optional, file paths or URLs, comma-separated)
   - **Acceptance criteria** (optional, one per line)
   - **Dependencies** (optional, comma-separated subtask IDs in format: {STORY_ID}-{NUM})
   - **Planning notes** (optional)

   After gathering details, show summary and ask: "Add this subtask? [Yes/No/Edit]"
   - If Yes: Add to list of subtasks to create
   - If No: Discard
   - If Edit: Allow editing specific fields

   Ask: "Add another subtask? [Yes/No]"
   - If Yes: Repeat for next subtask
   - If No: Proceed to step 7 (Create subtasks)

6. **Automatic breakdown analysis and generation**

   **Phase 1: Comprehensive Analysis**

   Perform thorough codebase and context analysis:

   **Codebase Investigation:**
   - Use Glob to explore project structure and understand patterns
   - Use Grep to search for related code and existing implementations
   - Use Read to examine files that would be affected
   - Identify existing abstractions, patterns, and technical debt
   - Understand code dependencies and integration points

   **Project Context:**
   - Read relevant documentation from `./documentation/`
   - Review related stories to understand completed/planned work:
     ```bash
     npx cc-devtools kanban list
     ```

   **Technology Research:**
   - Analyze existing technology choices in codebase
   - Research best practices for the technologies used
   - Identify most efficient implementation approaches
   - Determine appropriate library versions and APIs

   **Phase 2: Complexity Analysis**

   Generate comprehensive complexity assessment and display to user:

   ```
   ## Complexity Analysis for {STORY_TITLE}

   **Overall Complexity Score: {X}/10**

   **Key Complexity Drivers:**
   - {Specific factor that increases complexity}
   - {Another complexity factor}
   - {etc.}

   **Recommended Subtask Count: {X} subtasks**
   Rationale: {Why this number based on complexity}

   **Critical Risk Areas:**
   - {High-risk aspect requiring careful attention}
   - {Another risk area}

   **Implementation Strategy:**
   {Brief description of recommended approach based on complexity}

   **Technical Complexity Factors (1-10 scale):**
   - Code Modification Scope: {X}/10
   - Integration Complexity: {X}/10
   - Technology Novelty: {X}/10
   - Architecture Impact: {X}/10
   - Data Complexity: {X}/10
   - Testing Complexity: {X}/10
   ```

   **Complexity-Based Subtask Recommendations:**
   - Complexity 1-3: 2-4 subtasks (simple, straightforward work)
   - Complexity 4-6: 4-8 subtasks (moderate complexity)
   - Complexity 7-8: 6-12 subtasks (complex work)
   - Complexity 9-10: 8-15 subtasks (very complex, needs maximum granularity)

   **Phase 3: Generate Subtask Breakdown**

   For each subtask, generate:

   ```
   SUBTASK {NUMBER}: {TITLE}

   Description:
   {Detailed explanation of specific work to be done}

   Details:
   - Specific files to modify or create
   - Recommended libraries and approaches
   - Implementation patterns to follow
   - Integration points with existing code
   - Security considerations
   - Logging/monitoring requirements

   Acceptance Criteria:
   - {Specific, testable criterion 1}
   - {Specific, testable criterion 2}

   Planning Notes:
   {Technical considerations, alternatives evaluated, decision rationale}

   Effort Estimation: {X} hours

   Dependencies: {Subtask IDs or "none"}

   Relevant Documentation:
   {Links to relevant docs, specs, or resources}
   ```

   **Subtask Design Principles:**
   - Single responsibility per subtask
   - Independent testing capability
   - Logical progression (ordered by natural implementation sequence)
   - Concrete implementation guidance
   - Cross-cutting concerns integrated (security, logging, monitoring)
   - Effort between 2-8 hours per subtask depending on complexity

   **Phase 4: Present Breakdown to User**

   Display:
   ```
   PROPOSED SUBTASK BREAKDOWN
   ==========================

   Based on complexity analysis, I recommend {X} subtasks:

   {Display all proposed subtasks with details}

   Complexity Analysis Summary:
   - Overall complexity: {SCORE}/10
   - {Key complexity drivers}
   - Critical risks: {Risk areas}

   Would you like to:
   A. Create all subtasks as proposed
   B. Modify specific subtasks (I'll ask which)
   C. Add more subtasks
   D. Remove subtasks
   E. Cancel

   What would you like to do?
   ```

   Handle modifications similar to story creation:
   - Allow user to modify, add, or remove subtasks
   - Show updated breakdown after changes
   - Repeat until user approves

   Once approved, proceed to step 7

7. **Create subtasks in the story**

   Build a JSON string with the subtask specifications:

   ```json
   {
     "subtasks": [
       {
         "title": "...",
         "description": "...",
         "details": "...",
         "effort_estimation_hours": 4,
         "acceptance_criteria": [...],
         "dependent_upon": [...],
         "planning_notes": "...",
         "relevant_documentation": [...]
       },
       ...
     ],
     "complexityAnalysis": "## Complexity Analysis\n..."
   }
   ```

   Then run with inline JSON:
   ```bash
   npx cc-devtools kanban create-subtasks <storyId> '{...json...}'
   ```

8. **Parse result and display summary**

   If `success: false`:
   - Display error and stop

   If `success: true`:

   **If manual subtasks added:**
   ```
   SUBTASKS ADDED
   ==============

   Added {data.summary.count} subtasks to {data.storyId}:

   {For each in data.created:}
   {id}: {title}

   Total effort: {data.summary.totalEffort} hours

   Next steps:
   - View story with /kanban-detail {storyId}
   - Start work with /kanban-start-work {first subtask ID}
   - View board with /kanban-board
   ```

   **If automatic breakdown created:**
   ```
   AUTOMATIC BREAKDOWN COMPLETE
   ============================

   Created {data.summary.count} subtasks for {data.storyId} based on complexity analysis:

   {For each in data.created:}
   {id}: {title}

   Complexity: {SCORE}/10
   Total effort: {data.summary.totalEffort} hours
   Average per subtask: {data.summary.avgEffort} hours

   Complexity analysis added to story planning notes.

   Next steps:
   - Review breakdown with /kanban-detail {storyId}
   - Start work with /kanban-next
   - View board with /kanban-board
   ```

## Error Handling

If any script returns `success: false`:
- Display: "Error: {error}"
- Show stack trace for debugging if available

## Notes

- Manual mode is good for quick additions or when you know exactly what you need
- Automatic mode is ideal for complex stories requiring careful breakdown
- Complexity analysis is preserved in story planning notes for future reference
- Subtasks are ordered logically based on dependencies and implementation sequence
- Cross-cutting concerns (security, logging, monitoring) are integrated into relevant subtasks
- Aim for 2-8 hour subtasks to maintain manageable chunks
- The create-subtasks script handles ID generation and story updates automatically
