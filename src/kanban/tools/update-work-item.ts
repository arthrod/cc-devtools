import {
  readAllStories,
  readStory,
  parseId,
  saveStory,
  readConfig,
} from "../services/storage.js";
import {
  validateStoryMove,
  validateSubtaskMove,
  checkSubtasksComplete,
} from "../services/validation.js";
import type { StoryStatus, SubtaskStatus } from "../types.js";

import type { UpdateWorkItemArgs } from "./types.js";

export async function handleUpdateWorkItem(args: UpdateWorkItemArgs): Promise<Record<string, unknown>> {
  const { item_id, status: newStatus, implementation_notes } = args;

    const parsed = parseId(item_id);
    const story = await readStory(parsed.storyId);

    if (!story) {
      throw new Error(`Story ${parsed.storyId} not found`);
    }

    const timestamp = new Date().toISOString();
    const config = await readConfig();
    const allStories = await readAllStories();

    let oldStatus: string;
    const suggestions: string[] = [];

    if (parsed.type === "story") {
      const validationResult = await validateStoryMove(story.id, newStatus as StoryStatus, allStories, config);

      if (!validationResult.valid) {
        return {
          success: false,
          message: validationResult.error,
          validation_errors: validationResult.blockingStories
            ? validationResult.blockingStories.map((s) => `${s.id} is already in progress`)
            : validationResult.incompleteSubtasks
            ? validationResult.incompleteSubtasks.map((s) => `${s.id} not complete`)
            : [],
        };
      }

      oldStatus = story.status;
      story.status = newStatus as StoryStatus;
      story.updated_at = timestamp;

      if (newStatus === "done") {
        story.completion_timestamp = timestamp;
      } else if (oldStatus === "done") {
        story.completion_timestamp = undefined;
      }

      if (implementation_notes) {
        const noteText = `\n[${newStatus.toUpperCase()} on ${timestamp.split('T')[0]}]: ${implementation_notes}`;
        story.implementation_notes = (story.implementation_notes ?? "") + noteText;
      } else if (newStatus === "done") {
        suggestions.push("⚠️ No implementation notes provided.");
        suggestions.push("You should document what was done for future reference.");
      }

      await saveStory(story);

      const allSubtasksComplete = checkSubtasksComplete(story).complete;

      if (newStatus === "in_progress" && (!story.subtasks || story.subtasks.length === 0)) {
        const effort = story.effort_estimation_hours ?? 0;
        if (effort >= 4) {
          suggestions.push("⚠️ STOP: This story is too complex to work on without subtasks.");
          suggestions.push(`This is a ${effort}-hour story. You MUST break it down into subtasks before starting work.`);
          suggestions.push("Move this back to 'todo', create subtasks, then start again.");
        } else {
          suggestions.push("This story has no subtasks. Consider breaking it down for better tracking.");
        }
      }

      if (allSubtasksComplete && newStatus === "in_progress") {
        suggestions.push("⚠️ All subtasks are complete!");
        suggestions.push("You MUST move this story to 'in_review' status now.");
        suggestions.push("Do not continue working - the story is ready for review.");
      }

      return {
        success: true,
        message: `Updated ${story.id} status from ${oldStatus} to ${newStatus}`,
        suggestions,
      };
    } else {
      const subtask = story.subtasks?.find((st) => st.id === item_id);

      if (!subtask) {
        throw new Error(`Subtask ${item_id} not found`);
      }

      const validationResult = await validateSubtaskMove(item_id, newStatus as SubtaskStatus, allStories, config);

      if (!validationResult.valid) {
        return {
          success: false,
          message: validationResult.error,
          validation_errors: [validationResult.error],
        };
      }

      oldStatus = subtask.status;
      subtask.status = newStatus as SubtaskStatus;
      subtask.updated_at = timestamp;

      if (newStatus === "done") {
        subtask.completion_timestamp = timestamp;
      } else if (oldStatus === "done") {
        subtask.completion_timestamp = undefined;
      }

      if (implementation_notes) {
        const noteText = `\n[${newStatus.toUpperCase()} on ${timestamp.split('T')[0]}]: ${implementation_notes}`;
        subtask.implementation_notes = (subtask.implementation_notes ?? "") + noteText;
      } else if (newStatus === "done") {
        suggestions.push("⚠️ No implementation notes provided.");
        suggestions.push("You should document what was done for future reference.");
      }

      story.updated_at = timestamp;

      await saveStory(story);

      const allSubtasksComplete = checkSubtasksComplete(story).complete;
      const nextSubtask = story.subtasks?.find((st) => st.status === "todo");

      if (newStatus === "done" && nextSubtask) {
        suggestions.push(`Next subtask: ${nextSubtask.id} - ${nextSubtask.title}`);
      }

      if (allSubtasksComplete) {
        suggestions.push(`All subtasks complete! Move story ${story.id} to in_review`);
      }

      return {
        success: true,
        message: `Updated ${subtask.id} status from ${oldStatus} to ${newStatus}`,
        suggestions,
      };
    }
}
