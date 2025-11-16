# Add Stories

Interactive planning session to create one or more stories for a feature or product.

**Note**: The `create-stories` command supports bulk creation - it can create a single story or multiple stories in one operation.

## IMPORTANT: Use Kanban CLI Only

**NEVER modify `kanban.yaml` directly.** Always use the kanban CLI commands via `npx cc-devtools kanban <command>`. The CLI ensures data integrity, validation, and proper ID management. Direct YAML edits can corrupt the kanban system.

## Instructions

1. **Initial prompt to user**

   Ask: "What would you like to plan for? Please provide one of the following:
   - A description of a single story or feature to build
   - A description of a larger feature or product (I'll break it into multiple stories)
   - A path to a PRD (Product Requirements Document) or specification file
   - A request to analyze the entire codebase and plan development
   - Any other planning context

   Note: For a single simple story, I can create it directly. For complex features, I'll propose a breakdown into multiple stories."

2. **Gather context and research**

   Based on the user's input, perform comprehensive research:

   **If user provides a file path:**
   - Read the PRD/specification file
   - Extract requirements, goals, and constraints

   **If user requests codebase analysis:**
   - Read documentation files from `./documentation/`
   - Use Glob to explore project structure
   - Use Grep to understand existing patterns and technologies
   - Read relevant source code to understand current state

   **If user provides a description:**
   - Clarify requirements through questions
   - Understand scope and constraints

   **Technology Research (always do this):**
   - Research latest technologies, libraries, and frameworks appropriate for the project
   - Identify potential technical challenges, security concerns, or scalability issues
   - Consider industry standards and current best practices
   - Evaluate implementation approaches and recommend most efficient path
   - Provide specific library versions, APIs, and concrete guidance

   **Review existing work:**
   ```bash
   npx cc-devtools kanban list
   ```
   - Parse the output to understand what's been completed, in progress, and planned
   - Identify gaps and ensure new stories don't duplicate existing work

3. **Story planning principles**

   **Effort Limits:**
   - Stories should NOT exceed 30 hours of estimated effort
   - Always split stories if they can be broken into logical, independently testable components
   - Acceptable exceptions (require explicit justification in planning_notes):
     - Complex integration work that cannot be meaningfully subdivided (max 50 hours)
     - Critical infrastructure/foundation work spanning multiple systems (max 50 hours)
     - Data migration or one-time setup tasks with high interdependency (max 40 hours)

   **Story Focus:**
   - Each story should be atomic and focused on single responsibility
   - Order logically considering dependencies and implementation sequence
   - Early stories focus on setup and core functionality
   - Include detailed, actionable requirements
   - Generate clear acceptance criteria
   - Document research and planning thinking
   - Set appropriate dependencies (stories can only depend on lower IDs)
   - Assign business value based on importance
   - Provide detailed implementation guidance
   - Cross-cutting concerns (security, logging, monitoring) integrated into relevant stories

4. **Generate story breakdown**

   **If creating a single simple story:**
   - Skip to step 7 and create the story directly with user confirmation

   **If creating multiple stories:**
   - Create a comprehensive breakdown of all stories needed

   For each story, generate:

   ```
   STORY {NUMBER}: {TITLE}

   Phase: {PHASE}
   Business Value: {XS/S/M/L/XL}
   Estimated Effort: {X} hours

   Description:
   {1-3 sentence summary of what this story accomplishes}

   Details:
   {Very detailed implementation requirements including:
   - Pseudo-code and engineering approach
   - Recommended libraries and specific versions
   - Specific implementation guidance
   - Technology stack considerations
   - Security considerations
   - Logging and monitoring requirements}

   Acceptance Criteria:
   - {Specific, testable criterion 1}
   - {Specific, testable criterion 2}
   - {etc.}

   Planning Notes:
   {Research findings, decision-making rationale, alternative approaches considered,
   why this approach was chosen, any trade-offs, future considerations}

   Labels:
   {Comma-separated tags for categorization}

   Dependencies:
   {Story IDs that must be completed first, or "none"}

   Relevant Documentation:
   {Links to relevant docs, specs, or external resources}
   ```

5. **Present breakdown to user**

   Display all stories in the breakdown format above, then ask:

   "I've generated {X} stories for this planning session. Here's the breakdown:

   {DISPLAY ALL STORIES}

   Would you like to:
   A. Create all stories as-is
   B. Modify specific stories (I'll ask which ones)
   C. Add more stories
   D. Remove stories
   E. Cancel and start over

   What would you like to do?"

6. **Handle user choice**

   **If A (Create all):**
   - Proceed to step 7

   **If B (Modify):**
   - Ask: "Which story numbers would you like to modify? (comma-separated)"
   - For each story number:
     - Show current story details
     - Ask: "What would you like to change?"
     - Update the story based on feedback
     - Show updated story for confirmation
   - After all modifications, return to step 5

   **If C (Add more):**
   - Ask: "What additional stories should be added?"
   - Generate new stories based on input
   - Add to breakdown and return to step 5

   **If D (Remove):**
   - Ask: "Which story numbers should be removed? (comma-separated)"
   - Remove from breakdown
   - Recalculate dependencies if needed
   - Return to step 5

   **If E (Cancel):**
   - Display: "Planning session cancelled. No stories created."
   - Stop execution

7. **Create stories in kanban system**

   Build a JSON string with the story specifications:

   ```json
   {
     "stories": [
       {
         "title": "...",
         "description": "...",
         "details": "...",
         "phase": "MVP",
         "business_value": "L",
         "effort_estimation_hours": 8,
         "acceptance_criteria": [...],
         "dependent_upon": [...],
         "planning_notes": "...",
         "labels": [...],
         "relevant_documentation": [...]
       },
       ...
     ]
   }
   ```

   Then run with inline JSON:
   ```bash
   npx cc-devtools kanban create-stories '{...json...}'
   ```

8. **Parse result and display summary**

   If `success: false`:
   - Display error and stop

   If `success: true`:

   **For single story:**
   ```
   STORY CREATED
   =============

   {data.created[0].id}: {data.created[0].title}
   Status: todo
   Business Value: {story.business_value}
   Estimated Effort: {story.effort_estimation_hours} hours

   Next steps:
   - View story with /kanban-detail {ID}
   - View board with /kanban-board
   - Start work with /kanban-start-work {ID}
   ```

   **For multiple stories:**
   ```
   STORY CREATION COMPLETE
   =======================

   Created {data.summary.count} stories:

   {For each in data.created:}
   {id}: {title}

   Breakdown by phase:
   {For each phase in data.summary.byPhase:}
   - {phase}: {count} stories

   Breakdown by business value:
   {For each value in data.summary.byValue:}
   - {value}: {count} stories

   Total estimated effort: {data.summary.totalEffort} hours

   Next steps:
   - View all stories with /kanban-list todo
   - View board with /kanban-board
   - Prioritize with /kanban-list todo
   - Start work with /kanban-next
   ```

## Error Handling

If any script returns `success: false`:
- Display: "Error: {error}"
- Show stack trace for debugging if available

## Notes

- This command handles both single story creation and bulk planning sessions
- The AI should think deeply about story breakdown and dependencies
- Research phase is critical - don't skip it
- Always provide specific, actionable implementation guidance
- Stories should be independently testable and deliverable
- Use existing codebase patterns and conventions
- Consider security, logging, and monitoring in every story
- Document decision-making in planning_notes for future reference
- The create-stories script handles ID generation and config updates automatically
