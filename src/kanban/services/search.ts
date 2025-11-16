/**
 * Hybrid keyword + semantic search for kanban stories and subtasks
 */

import { readEmbeddings, saveEmbeddings } from '../core/storage.js';
import type { Story, Subtask, StoryStatus, SubtaskStatus, KanbanSearchResult, SearchOptions } from '../types.js';

import { generateEmbedding } from '../../shared/embeddings.js';
import { hybridSearch, lazyRegenerateEmbeddings } from '../../shared/hybrid-search.js';

import type { KeywordScore } from '../../shared/types/search.js';

/**
 * Searchable item (Story or Subtask with metadata)
 */
interface SearchableStory extends Story {
  id: string;
}

// @type-duplicate-allowed
interface SearchableSubtask extends Subtask {
  id: string;
  story_id: string; // Parent story ID for context
}

/**
 * Story-specific keyword scoring function
 */
function scoreStoryKeywords(query: string, story: SearchableStory): KeywordScore {
  const reasons: string[] = [];
  let score = 0;

  // Check title for exact and partial matches
  const titleLower = story.title.toLowerCase();
  if (titleLower === query) {
    score += 1.0;
    reasons.push('exact title match');
  } else if (titleLower.includes(query)) {
    score += 0.7;
    reasons.push('partial title match');
  }

  // Check description
  if (story.description?.toLowerCase().includes(query)) {
    score += 0.7;
    reasons.push('description match');
  }

  // Check labels for exact and partial matches
  if (story.labels) {
    for (const label of story.labels) {
      if (label.toLowerCase() === query) {
        score += 1.0;
        reasons.push('exact label match');
        break;
      } else if (label.toLowerCase().includes(query)) {
        score += 0.7;
        reasons.push('partial label match');
        break;
      }
    }
  }

  return { score, reasons };
}

/**
 * Subtask-specific keyword scoring function
 */
function scoreSubtaskKeywords(query: string, subtask: SearchableSubtask): KeywordScore {
  const reasons: string[] = [];
  let score = 0;

  // Check title for exact and partial matches
  const titleLower = subtask.title.toLowerCase();
  if (titleLower === query) {
    score += 1.0;
    reasons.push('exact title match');
  } else if (titleLower.includes(query)) {
    score += 0.7;
    reasons.push('partial title match');
  }

  // Check description
  if (subtask.description?.toLowerCase().includes(query)) {
    score += 0.7;
    reasons.push('description match');
  }

  return { score, reasons };
}

/**
 * Generate embedding for a story
 */
async function generateStoryEmbedding(story: SearchableStory): Promise<number[] | null> {
  const text = `${story.title}\n${story.description ?? ''}\n${story.details ?? ''}`;
  return generateEmbedding(text);
}

/**
 * Generate embedding for a subtask
 */
async function generateSubtaskEmbedding(subtask: SearchableSubtask): Promise<number[] | null> {
  const text = `${subtask.title}\n${subtask.description ?? ''}\n${subtask.details ?? ''}`;
  return generateEmbedding(text);
}

/**
 * Search stories using hybrid keyword + semantic search
 */
async function searchStories(
  query: string,
  stories: Story[],
  limit: number,
  similarityThreshold: number,
  statusFilter?: StoryStatus
): Promise<KanbanSearchResult[]> {
  // Filter by status if provided
  let filteredStories = stories;
  if (statusFilter) {
    filteredStories = stories.filter(s => s.status === statusFilter);
  }

  // Ensure all stories have embeddings
  let embeddings = readEmbeddings();
  embeddings = await lazyRegenerateEmbeddings(
    filteredStories,
    embeddings,
    generateStoryEmbedding,
    saveEmbeddings
  );

  // Perform hybrid search
  const results = await hybridSearch({
    query,
    items: filteredStories,
    embeddings,
    keywordScoreFn: scoreStoryKeywords,
    generateEmbedding: async (q: string) => generateEmbedding(q),
    similarityThreshold
  });

  // Convert to KanbanSearchResult format
  return results.slice(0, limit).map(({ item, score, reasons }) => ({
    type: 'story' as const,
    id: item.id,
    title: item.title,
    status: item.status,
    score,
    match_reason: reasons.join(', ')
  }));
}

/**
 * Search subtasks using hybrid keyword + semantic search
 */
async function searchSubtasks(
  query: string,
  stories: Story[],
  limit: number,
  similarityThreshold: number,
  statusFilter?: SubtaskStatus,
  storyIdFilter?: string
): Promise<KanbanSearchResult[]> {
  // Extract all subtasks with parent story ID
  const allSubtasks: SearchableSubtask[] = [];

  for (const story of stories) {
    if (!story.subtasks) continue;

    // Filter by story ID if provided
    if (storyIdFilter && story.id !== storyIdFilter) continue;

    for (const subtask of story.subtasks) {
      // Filter by status if provided
      if (statusFilter && subtask.status !== statusFilter) continue;

      allSubtasks.push({
        ...subtask,
        story_id: story.id
      });
    }
  }

  if (allSubtasks.length === 0) {
    return [];
  }

  // Ensure all subtasks have embeddings
  let embeddings = readEmbeddings();
  embeddings = await lazyRegenerateEmbeddings(
    allSubtasks,
    embeddings,
    generateSubtaskEmbedding,
    saveEmbeddings
  );

  // Perform hybrid search
  const results = await hybridSearch({
    query,
    items: allSubtasks,
    embeddings,
    keywordScoreFn: scoreSubtaskKeywords,
    generateEmbedding: async (q: string) => generateEmbedding(q),
    similarityThreshold
  });

  // Convert to KanbanSearchResult format
  return results.slice(0, limit).map(({ item, score, reasons }) => ({
    type: 'subtask' as const,
    id: item.id,
    story_id: item.story_id,
    title: item.title,
    status: item.status,
    score,
    match_reason: reasons.join(', ')
  }));
}

/**
 * Search kanban items (stories and/or subtasks) using hybrid search
 */
export async function searchKanban(
  stories: Story[],
  options: SearchOptions
): Promise<KanbanSearchResult[]> {
  const {
    query,
    limit = 5,
    similarityThreshold = 0.3,
    scope = 'stories',
    status,
    storyId
  } = options;

  // Validate query
  if (query.trim() === '') {
    throw {
      message: 'Query cannot be empty. Provide a search term to find related stories or subtasks.',
      code: 'INVALID_INPUT'
    };
  }

  // Search based on scope
  if (scope === 'stories') {
    return searchStories(
      query,
      stories,
      limit,
      similarityThreshold,
      status as StoryStatus | undefined
    );
  }

  if (scope === 'subtasks') {
    return searchSubtasks(
      query,
      stories,
      limit,
      similarityThreshold,
      status as SubtaskStatus | undefined,
      storyId
    );
  }

  // scope === 'both'
  const storyResults = await searchStories(
    query,
    stories,
    limit * 2, // Get more results initially
    similarityThreshold,
    status as StoryStatus | undefined
  );

  const subtaskResults = await searchSubtasks(
    query,
    stories,
    limit * 2, // Get more results initially
    similarityThreshold,
    status as SubtaskStatus | undefined,
    storyId
  );

  // Merge and sort by score
  const combined = [...storyResults, ...subtaskResults].sort((a, b) => b.score - a.score);

  return combined.slice(0, limit);
}
