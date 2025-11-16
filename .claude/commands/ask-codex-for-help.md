# Ask Codex for Help

You are helping debug a problem. Follow this process:

## Step 1: Gather Context
Analyze the conversation history and current state to compile:

1. **Problem Statement**: What issue are we trying to solve?
2. **Requirements**: Any known requirements or constraints
3. **Related Context**: Background information, related files, dependencies
4. **History**: What have we tried? What worked? What didn't?
5. **Current Progress**: Where are we now?
6. **Error Messages**: Any diagnostic errors, type errors, runtime errors
7. **Code References**:
   - File paths with line numbers
   - Function/component names
   - Relevant code snippets

## Step 2: Formulate Request to Codex
Create a comprehensive request for Codex that includes:

- Clear problem description
- Full context from above
- Specific file references (e.g., `KanbanFilters.tsx:184`)
- Code snippets showing the problematic code
- What we've already tried

Ask Codex to provide:
1. **Well-structured discussion** of the problem
2. **Root cause analysis** - what it believes is causing this
3. **Other possible causes** to consider
4. **Most likely solution** - what should be done first
5. **Alternative solutions** - other approaches to try

Tell Codex it can ask for more information if needed.

## Step 3: Send to Codex
Use the `mcp__codex__codex` tool to send the request. Track the conversation round (starts at 1).

## Step 4: Handle Codex Response

**Important**: Codex can ask clarifying questions up to **5 times maximum**. Track each round of communication.

### If Codex asks clarifying questions (rounds 1-4):
- **If you know the answer**:
  - Respond directly to Codex using `mcp__codex__codex-reply`
  - Include **FULL conversation history**: original request → Codex's question → your answer **Include all questions and answers from the entire process, Codex can not remember between repeated requests**
  - Continue the dialogue

- **If you don't know the answer**:
  - Ask the user for the information
  - Wait for user response
  - Then respond to Codex using `mcp__codex__codex-reply` with **FULL conversation history**: original request → Codex's question → user's answer **Include all questions and answers from the entire process, Codex can not remember between repeated requests**
  - Continue the dialogue

**Critical**: Whether you or the user provides the answer, ALWAYS send the full conversation history to Codex.

### Round 5 (Final Round):
If this is the 5th communication to Codex, you MUST inform Codex:
- "This is our final exchange - please provide your best possible conclusion with no further questions."
- Codex must provide a definitive answer with its best recommendations

### If Codex provides final answer (or after round 5):
Present to the user:
1. **Summary**: Brief overview of what Codex identified
2. **Root Cause**: What's causing the issue
3. **Recommended Solution**: Step-by-step plan
4. **Alternative Approaches**: Other options if primary doesn't work
5. **Your Plan**: How you intend to implement the fix

## Step 5: Implement
After user approval, proceed with the recommended solution.

---

**Round Tracking**: Keep count of Codex exchanges:
- Round 1: Initial request, clarifying questions allowed
- Rounds 2-4: Follow-up requests, Clarifying questions allowed
- Round 5: Final request - must conclude

**Note**: Always maintain full conversation context when communicating with Codex. Include code snippets, file paths with line numbers, and specific error messages in every communication.
