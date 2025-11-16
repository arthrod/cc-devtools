import { formatStoryOutput, formatSubtaskOutput } from "../services/formatters.js";
import {
  getNextWorkItem,
  analyzeProgress,
} from "../services/recommendation.js";
import { readAllStories, readConfig } from "../services/storage.js";

export async function handleGetWorkItem(includeDetails = false): Promise<Record<string, unknown>> {
  const allStories = await readAllStories();
  const config = await readConfig();
  const next = getNextWorkItem(allStories, config.phases);

  if (!next) {
    return {
      hasCurrentWork: false,
      recommendation: "No work in progress and no todo stories available",
      next_steps: ["Create new stories or check dependencies"],
    };
  }

  let response: Record<string, unknown> = {};

  const outputMode = includeDetails ? 'full' : 'condensed';
  const warning = !includeDetails
    ? 'Condensed output: Some fields are hidden. Set includeDetails=true to see all fields including: description, details, planning_notes, implementation_notes, relevant_documentation, completion_timestamp, updated_at'
    : undefined;

    if (next.type === "subtask" && next.subtask) {
      const formattedStory = next.story ? formatStoryOutput(next.story, outputMode) : undefined;
      const formattedSubtask = formatSubtaskOutput(next.subtask, outputMode);

      response = {
        current_work: {
          story: formattedStory,
          subtask: formattedSubtask,
        },
        recommendation: `Continue working on ${next.subtask.id}: ${next.subtask.title}`,
        alternatives:
          next.story?.subtasks
            ?.filter((st) => st.status === "todo" && st.id !== next.subtask?.id)
            .slice(0, 3)
            .map((st) => ({
              subtask_id: st.id,
              subtask_title: st.title,
              reason: "Other todo subtask in current story",
            })) ?? [],
        next_steps: [
          "Continue implementation",
          "When complete, add implementation_notes and mark as done",
        ],
        ...(warning ? { warning } : {}),
      };
    } else if (next.type === "story") {
      const story = next.story ?? next.item;
      if (!story) {
        throw new Error("Story object missing from next work item");
      }

      const progress = analyzeProgress(story);
      const formattedStory = formatStoryOutput(story, outputMode);

      if (story.status === "in_progress") {
        if (progress.complete && progress.hasSubtasks) {
          response = {
            current_work: {
              story: formattedStory,
            },
            recommendation: `All subtasks complete for ${story.id}. Ready for review.`,
            next_steps: ["Move to in_review", "Create a pull request"],
            ...(warning ? { warning } : {}),
          };
        } else {
          const nextSubtask = progress.nextSubtask;
          const formattedNextSubtask = nextSubtask ? formatSubtaskOutput(nextSubtask, outputMode) : undefined;

          response = {
            current_work: {
              story: formattedStory,
              next_subtask: formattedNextSubtask,
            },
            recommendation: nextSubtask
              ? `Work on next subtask: ${nextSubtask.id} - ${nextSubtask.title}`
              : `Continue work on ${story.id}`,
            alternatives:
              story.subtasks
                ?.filter((st) => st.status === "todo" && st.id !== nextSubtask?.id)
                .slice(0, 3)
                .map((st) => ({
                  subtask_id: st.id,
                  subtask_title: st.title,
                })) ?? [],
            next_steps: nextSubtask
              ? [`Start ${nextSubtask.id}`, "Update status to in_progress"]
              : ["Continue current work"],
            ...(warning ? { warning } : {}),
          };
        }
      } else {
        response = {
          recommendation: `Start work on ${story.id}: ${story.title}`,
          next_steps: [
            "Confirm this is the desired work item",
            `Update ${story.id} status to in_progress`,
            story.subtasks?.[0]
              ? `Start first subtask: ${story.subtasks[0].id}`
              : "Begin development",
          ],
          story: formattedStory,
          ...(warning ? { warning } : {}),
        };
      }
    }

    return response;
}
