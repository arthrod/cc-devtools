# Groom Kanban Board

Display board statistics and identify critical issues that need attention.

## IMPORTANT: Use Kanban CLI Only

**NEVER modify `kanban.yaml` directly.** Always use the kanban CLI commands via `npx cc-devtools kanban <command>`. The CLI ensures data integrity, validation, and proper ID management. Direct YAML edits can corrupt the kanban system.

## Instructions

1. **Run the kanban stats command with health check**
   ```bash
   npx cc-devtools kanban stats -- --health-check
   ```

2. **Parse JSON output and check for errors**
   - If `success: false`, display the error message and stop

3. **Display statistics from `data.stats`**

   ```
   KANBAN STATISTICS
   =================

   STORY DISTRIBUTION
   ------------------
   Total Stories: {distribution.total}
   ├─ Todo:        {byStatus.todo} ({percentage}%)
   ├─ In Progress: {byStatus.in_progress} ({percentage}%)
   ├─ In Review:   {byStatus.in_review} ({percentage}%)
   ├─ Blocked:     {byStatus.blocked} ({percentage}%)
   └─ Done:        {byStatus.done} ({percentage}%)

   By Phase:
   {For each phase in distribution.byPhase:}
   ├─ {phase}:  {count} ({percentage}%)

   By Business Value:
   {For each value in distribution.byValue:}
   ├─ {value}: {count} ({percentage}%)

   PROGRESS METRICS
   ----------------
   Completion Rate: {progress.completionRate * 100}% ({completed}/{total})
   Velocity: {progress.velocity} stories completed in last 7 days
   Average Subtasks: {progress.avgSubtasks} per story

   EFFORT ANALYSIS
   ---------------
   Total Estimated: {effort.total} hours
   ├─ Done:         {byStatus.done} hours ({percentage}%)
   ├─ In Review:    {byStatus.in_review} hours ({percentage}%)
   ├─ In Progress:  {byStatus.in_progress} hours ({percentage}%)
   └─ Todo:         {byStatus.todo} hours ({percentage}%)

   Average by Business Value:
   {For each value in effort.avgByValue:}
   ├─ {value}: {hours} hours

   SUBTASKS
   --------
   Total Subtasks: {subtasks.total}
   ├─ Completed:    {subtasks.completed} ({percentage}%)
   ├─ In Progress:  {count} ({percentage}%)
   ├─ Todo:         {count} ({percentage}%)
   └─ Blocked:      {count} ({percentage}%)

   {If labels array not empty:}
   LABELS (Top 5)
   --------------
   {For each label in stats.labels (max 5):}
   {index + 1}. {label.label} ({label.count} stories)

   DEPENDENCIES
   ------------
   Stories with dependencies: {dependencies.withDependencies}
   Stories blocking others: {dependencies.blockingOthers}
   Stories ready to start: {dependencies.readyToStart}

   {If time data available:}
   TIME ANALYSIS
   -------------
   {If oldestTodo:}
   Oldest todo story: {oldestTodo.days} days ({oldestTodo.id})
   {If avgTimeToComplete:}
   Average time to complete: {avgTimeToComplete} days
   ```

4. **Display health check results from `data.health`**

   ```
   ---

   CRITICAL ISSUES FOUND
   =====================
   ```

   If `health.healthy` is true:
   ```
   ✅ No critical issues found! Board is healthy.
   ```

   If `health.healthy` is false:
   ```
   Found {health.summary.critical} critical issues requiring attention:

   {For each issue in health.issues:}

   {If type === 'TODO_WITHOUT_SUBTASKS':}
   ⚠️  CRITICAL: {issue.story.id} | {issue.story.title}
      Status: todo
      Problem: {issue.message}
      Impact: Cannot start work on this story
      Solution: {issue.solution}

   {If type === 'COMPLETED_SUBTASKS_NOT_IN_REVIEW':}
   ⚠️  CRITICAL: {issue.story.id} | {issue.story.title}
      Status: in_progress
      Problem: {issue.message}
      Impact: Work is done but not being reviewed/completed
      Solution: {issue.solution}

   {If type === 'MULTIPLE_IN_PROGRESS':}
   🚨 CRITICAL: {issue.message}
      Found {issue.stories.length} stories in progress:
      {For each story in issue.stories:}
      - {story.id} | {story.title}

      Impact: Violates single-focus workflow, causes confusion
      Solution: {issue.solution}

   {If type === 'INSUFFICIENT_DETAIL':}
   ⚠️  CRITICAL: {issue.item.id} | {issue.item.title}
      Problem: {issue.message}
      Missing: {issue.missing.join(', ')}
      Impact: Developer won't know what to implement or how to verify completion
      Solution: {issue.solution}

   ---

   RECOMMENDED ACTIONS
   ===================

   Priority order to resolve issues:

   1. Fix workflow violations (multiple stories in progress)
   2. Move completed work to review (all subtasks done)
   3. Add implementation details to underspecified items
   4. Break down todo stories without subtasks

   Use the suggested commands above to resolve each issue.
   ```

## Error Handling

If the script returns `success: false`:
- Display: "Error: {error}"
- Show stack trace for debugging if available

## Notes

- The script calculates all statistics and performs health checks
- Focus is on critical issues that block work, not minor inconsistencies
- Suggested solutions include exact commands to run
- Run periodically (weekly?) to keep board clean
- Critical issues are things that prevent effective workflow
- The health check validates:
  - Stories in TODO have subtasks defined
  - Stories with all subtasks complete are moved to review
  - Only one story is in progress at a time
  - All items have sufficient detail for implementation
