# Display Kanban Board

Show an overview of all stories in a visual board layout.

## IMPORTANT: Use Kanban CLI Only

**NEVER modify `kanban.yaml` directly.** Always use the kanban CLI commands via `npx cc-devtools kanban <command>`. The CLI ensures data integrity, validation, and proper ID management. Direct YAML edits can corrupt the kanban system.

## Instructions

1. **Get all stories and statistics**
   ```bash
   npx cc-devtools kanban list
   ```

2. **Parse JSON output and check for errors**
   - If `success: false`, display the error message and stop

3. **Build visual board from data**

   Use `data.grouped` to get stories by status and `data.formatted` for display-ready story cards.

   Create a board with columns approximately 25-30 characters wide each, showing 3-4 columns per row:

   **Row 1:** TODO | IN PROGRESS | IN REVIEW | DONE
   **Row 2:** BLOCKED

4. **Display the board**

   ```
   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┯━━━━━━━━━━━━━━━━━━━━━━━━━━┯━━━━━━━━━━━━━━━━━━━━━━━━━━┯━━━━━━━━━━━━━━━━━━━━━━━━━━┓
   ┃ TODO ({count})            │ IN PROGRESS ({count}) ⚡  │ IN REVIEW ({count})      │ DONE ({count}) ✓         ┃
   ┠──────────────────────────┼──────────────────────────┼──────────────────────────┼──────────────────────────┨
   ┃ {for each story:}         │ {for each story:}        │ {for each story:}        │ {for each story:}        ┃
   ┃ ┌────────────────────┐   │ ┌────────────────────┐   │ ┌────────────────────┐   │ ┌────────────────────┐   ┃
   ┃ │ {ID}          [{V}] │   │ │►{ID}          [{V}] │   │ │ {ID}          [{V}] │   │ │ {ID}          [{V}] │   ┃
   ┃ │ {title truncated}   │   │ │ {title truncated}   │   │ │ {title truncated}   │   │ │ {title truncated}   │   ┃
   ┃ │ {progress dots}     │   │ │ {progress dots}     │   │ │ {progress dots}     │   │ │ {progress dots}     │   ┃
   ┃ └────────────────────┘   │ └────────────────────┘   │ └────────────────────┘   │ └────────────────────┘   ┃
   ┃                          │                          │                          │                          ┃
   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━┷━━━━━━━━━━━━━━━━━━━━━━━━━━┷━━━━━━━━━━━━━━━━━━━━━━━━━━┷━━━━━━━━━━━━━━━━━━━━━━━━━━┛

   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓
   ┃ BLOCKED ({count}) ⚠️      ┃
   ┠──────────────────────────┨
   ┃ {for each story:}         ┃
   ┃ ┌────────────────────┐   ┃
   ┃ │ {ID}          [{V}] │   ┃
   ┃ │ {title truncated}   │   ┃
   ┃ │ 🚫 {blocker note}   │   ┃
   ┃ └────────────────────┘   ┃
   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛

   📊 Summary: {summary.total} stories total | {phase breakdown} | 🔥 Working on: {current story ID or "none"}
   ```

5. **Story Card Format**

   Each story card should display:
   ```
   ┌────────────────────┐
   │ {ID}          [{V}] │  <- ID left-aligned, value right-aligned
   │ {Title truncated}   │  <- Title truncated to ~18 chars
   │ {Progress or note}  │  <- Subtask dots (●●○○○) or blocker emoji
   └────────────────────┘
   ```

   Use `data.formatted[].progress.dots` for subtask progress indicators.

   **Special Indicators:**
   - `►` prefix for in-progress story (get from data.grouped.in_progress[0])
   - `⚡` icon in IN PROGRESS column header
   - `⚠️` icon in BLOCKED column header
   - `✓` icon in DONE column header
   - `🚫` emoji for blocker notes (show first few words from implementation_notes if blocked)

6. **Title Truncation**
   - Truncate titles to fit card width (~18-20 chars) using formatters logic
   - Use `...` if truncated
   - Try to break at word boundaries

7. **Column Layout**
   - Each column: 26 characters wide
   - Card width: 20 characters (fits inside with padding)
   - Use box-drawing characters for clean lines
   - Minimum column height to align rows
   - Limit displayed stories per column (e.g., show max 5, then "...+N more")

8. **Summary Line**
   ```
   📊 Summary: {data.summary.total} stories total | {For each phase: phase: count} | 🔥 Working on: {current or "none"}
   ```

   Get current story from `data.grouped.in_progress[0]?.id` or "none"

## Error Handling

If the script returns `success: false`:
- Display: "Error: {error}"
- Show stack trace for debugging if available

## Notes

- The script provides all data in `data.grouped` (stories by status)
- Use `data.formatted` for display-ready story cards with progress dots
- Use `data.summary` for statistics
- All box-drawing uses Unicode characters
- If terminal is too narrow, fall back to simpler vertical list layout
- Empty columns show "(no stories)" message
