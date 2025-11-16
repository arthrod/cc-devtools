import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { MarkdownEditor } from '../common/MarkdownEditor';
import { Input, Select, ArrayFieldInput, StoryAutocomplete } from '../shared';
import { Save, Tag, Link, FileText } from 'lucide-react';
import type { Story, BusinessValue } from '../../../../kanban/types.js';
import { useCreateStory, useUpdateStory, useStories, useKanbanConfig } from '../../hooks/useStories';
import { UnsavedChangesModal } from './UnsavedChangesModal';
import { ReviewsModal } from './ReviewsModal';
import { useQuery } from '@tanstack/react-query';
import { fetchStoryReviews } from '../../services/kanban.service';

interface StoryFormProps {
  story?: Story;
  onClose: () => void;
  defaultPhase?: string;
}

/**
 * Form modal for creating and editing kanban stories.
 * Supports all story fields from the schema including markdown fields for details,
 * planning notes, and implementation notes.
 */
export function StoryForm({ story, onClose, defaultPhase }: StoryFormProps): JSX.Element {
  const isEditing = !!story;
  const createStory = useCreateStory();
  const updateStory = useUpdateStory();
  const { data: allStories = [] } = useStories();
  const { data: config } = useKanbanConfig();

  const initialFormData = {
    title: story?.title ?? '',
    description: story?.description ?? '',
    phase: story?.phase ?? defaultPhase ?? config?.phases?.[0] ?? '',
    business_value: story?.business_value ?? '',
    labels: story?.labels ?? [],
    effort_estimation_hours: story?.effort_estimation_hours ?? 0,
    dependent_upon: story?.dependent_upon ?? [],
    acceptance_criteria: story?.acceptance_criteria ?? [],
    details: story?.details ?? '',
    planning_notes: story?.planning_notes ?? '',
    implementation_notes: story?.implementation_notes ?? '',
    relevant_documentation: story?.relevant_documentation ?? []
  };

  const [formData, setFormData] = useState(initialFormData);

  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const { data: reviews = [] } = useQuery({
    queryKey: ['story-reviews', story?.id],
    queryFn: () => story ? fetchStoryReviews(story.id) : Promise.resolve([]),
    enabled: isEditing,
    staleTime: 5 * 60 * 1000,
  });

  // Track if form data has changed from initial state
  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    setIsDirty(hasChanges);
  }, [formData, initialFormData]);

  const handleClose = (): void => {
    if (isDirty) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = (): void => {
    setShowUnsavedWarning(false);
    onClose();
  };

  const handleCancelClose = (): void => {
    setShowUnsavedWarning(false);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      if (isEditing) {
        // When editing, don't send phase (it's immutable)
        const updates = {
          title: formData.title,
          description: formData.description,
          business_value: (formData.business_value || undefined) as BusinessValue | undefined,
          labels: formData.labels,
          effort_estimation_hours: formData.effort_estimation_hours,
          dependent_upon: formData.dependent_upon,
          acceptance_criteria: formData.acceptance_criteria,
          details: formData.details,
          planning_notes: formData.planning_notes,
          implementation_notes: formData.implementation_notes || null,
          relevant_documentation: formData.relevant_documentation
        };

        await updateStory.mutateAsync({
          id: story.id,
          updates
        });
      } else {
        // When creating, include phase
        const createData = {
          title: formData.title,
          description: formData.description,
          phase: formData.phase,
          business_value: (formData.business_value || undefined) as BusinessValue | undefined,
          labels: formData.labels,
          effort_estimation_hours: formData.effort_estimation_hours,
          dependent_upon: formData.dependent_upon,
          acceptance_criteria: formData.acceptance_criteria,
          details: formData.details,
          planning_notes: formData.planning_notes,
          implementation_notes: formData.implementation_notes || null,
          relevant_documentation: formData.relevant_documentation
        };

        await createStory.mutateAsync(createData);
      }
      setIsDirty(false); // Clear dirty flag on successful save
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    }
  };

  const isLoading = createStory.isPending || updateStory.isPending;

  const phaseOptions = (config?.phases ?? []).map(phase => ({
    value: phase,
    label: phase
  }));

  const businessValueOptions = (config?.business_values ?? []).map(value => ({
    value,
    label: value
  }));

  return (
    <>
      <Modal
        isOpen={true}
        onClose={handleClose}
      >
        {/* Custom Header with Review Count */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {isEditing ? `Edit Story: ${story.id}` : 'Create New Story'}
            </h2>
            {isEditing && reviews.length > 0 && (
              <button
                type="button"
                onClick={() => setShowReviewsModal(true)}
                className="flex items-center space-x-2 px-3 py-1 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span>{reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}</span>
              </button>
            )}
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {error}
            </div>
          )}

        {!isEditing && (
          <div>
            <label htmlFor="phase" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phase <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.phase}
              onChange={(value) => setFormData({ ...formData, phase: value })}
              options={phaseOptions}
              placeholder="Select phase..."
              disabled={isLoading}
            />
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            id="title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Enter story title..."
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <MarkdownEditor
            value={formData.description}
            onChange={(value) => setFormData({ ...formData, description: value })}
            placeholder="Describe the story (markdown supported)..."
            disabled={isLoading}
            rows={4}
          />
        </div>

        <div>
          <label htmlFor="business-value" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Business Value
          </label>
          <Select
            value={formData.business_value}
            onChange={(value) => setFormData({ ...formData, business_value: value })}
            options={businessValueOptions}
            placeholder="Select business value..."
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="effort" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Effort (hours)
          </label>
          <Input
            type="number"
            id="effort"
            min={0}
            step={0.5}
            value={formData.effort_estimation_hours}
            onChange={(e) => setFormData({ ...formData, effort_estimation_hours: parseFloat(e.target.value) || 0 })}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags
          </label>
          <ArrayFieldInput
            values={formData.labels}
            onAdd={(label) => setFormData({ ...formData, labels: [...formData.labels, label] })}
            onRemove={(index) => setFormData({ ...formData, labels: formData.labels.filter((_, i) => i !== index) })}
            placeholder="Add tag..."
            chipVariant="primary"
            chipIcon={<Tag className="h-3 w-3" />}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dependencies
          </label>
          <ArrayFieldInput
            values={formData.dependent_upon}
            onAdd={(depId) => setFormData({ ...formData, dependent_upon: [...formData.dependent_upon, depId] })}
            onRemove={(index) => setFormData({ ...formData, dependent_upon: formData.dependent_upon.filter((_, i) => i !== index) })}
            placeholder="Search for dependency..."
            chipVariant="secondary"
            hideAddButton={true}
            renderInput={() => (
              <StoryAutocomplete
                stories={allStories}
                onSelect={(storyId) => {
                  if (!formData.dependent_upon.includes(storyId)) {
                    setFormData({ ...formData, dependent_upon: [...formData.dependent_upon, storyId] });
                  }
                }}
                excludeIds={story ? [story.id, ...formData.dependent_upon] : formData.dependent_upon}
                placeholder="Search for dependency..."
              />
            )}
            renderItem={(depId) => {
              const depStory = allStories.find(s => s.id === depId);
              return depStory ? `${depId}: ${depStory.title}` : depId;
            }}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Acceptance Criteria
          </label>
          <ArrayFieldInput
            values={formData.acceptance_criteria}
            onAdd={(criteria) => setFormData({ ...formData, acceptance_criteria: [...formData.acceptance_criteria, criteria] })}
            onRemove={(index) => setFormData({ ...formData, acceptance_criteria: formData.acceptance_criteria.filter((_, i) => i !== index) })}
            placeholder="Add acceptance criteria..."
            itemVariant="list-item"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="details" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Details
          </label>
          <MarkdownEditor
            value={formData.details}
            onChange={(value) => setFormData({ ...formData, details: value })}
            placeholder="Additional details (markdown supported with mermaid diagrams)..."
            disabled={isLoading}
            rows={4}
          />
        </div>

        <div>
          <label htmlFor="planning-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Planning Notes
          </label>
          <MarkdownEditor
            value={formData.planning_notes}
            onChange={(value) => setFormData({ ...formData, planning_notes: value })}
            placeholder="Planning notes (markdown supported with mermaid diagrams)..."
            disabled={isLoading}
            rows={4}
          />
        </div>

        <div>
          <label htmlFor="implementation-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Implementation Notes
          </label>
          <MarkdownEditor
            value={formData.implementation_notes}
            onChange={(value) => setFormData({ ...formData, implementation_notes: value })}
            placeholder="Implementation notes (markdown supported with mermaid diagrams)..."
            disabled={isLoading}
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Relevant Documentation
          </label>
          <ArrayFieldInput
            values={formData.relevant_documentation}
            onAdd={(docLink) => setFormData({ ...formData, relevant_documentation: [...formData.relevant_documentation, docLink] })}
            onRemove={(index) => setFormData({ ...formData, relevant_documentation: formData.relevant_documentation.filter((_, i) => i !== index) })}
            placeholder="Add documentation link..."
            itemVariant="list-item"
            renderItemContent={(docLink) => (
              <>
                <Link className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 break-all">
                  {docLink}
                </span>
              </>
            )}
            disabled={isLoading}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-neutral-700">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>{isEditing ? 'Update Story' : 'Create Story'}</span>
          </Button>
        </div>
      </form>

        <UnsavedChangesModal
          isOpen={showUnsavedWarning}
          onClose={handleCancelClose}
          onConfirm={handleConfirmClose}
        />
      </Modal>

      {isEditing && story && (
        <ReviewsModal
          isOpen={showReviewsModal}
          onClose={() => setShowReviewsModal(false)}
          storyId={story.id}
          reviews={reviews}
        />
      )}
    </>
  );
}
