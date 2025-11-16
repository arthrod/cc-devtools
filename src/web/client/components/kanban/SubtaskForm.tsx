import { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { MarkdownEditor } from '../common/MarkdownEditor';
import { Input, ArrayFieldInput, SubtaskDependencyAutocomplete } from '../shared';
import { Save, Link } from 'lucide-react';
import type { Subtask, Story } from '../../../../kanban/types.js';
import { useCreateSubtask, useUpdateSubtask, useStories } from '../../hooks/useStories';
import { UnsavedChangesModal } from './UnsavedChangesModal';

interface SubtaskFormProps {
  storyId: string;
  subtask?: Subtask;
  onClose: () => void;
}

/**
 * Form modal for creating and editing subtasks.
 * Supports all subtask fields from the schema including markdown fields for details,
 * planning notes, and implementation notes.
 */
export function SubtaskForm({ storyId, subtask, onClose }: SubtaskFormProps): JSX.Element {
  const isEditing = !!subtask;
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const { data: allStories = [] } = useStories();

  // Get the parent story and its subtasks for dependency selection
  const parentStory = allStories.find((s: Story) => s.id === storyId);
  const availableSubtasks = parentStory?.subtasks ?? [];

  const initialFormData = {
    title: subtask?.title ?? '',
    description: subtask?.description ?? '',
    details: subtask?.details ?? '',
    effort_estimation_hours: subtask?.effort_estimation_hours ?? 0,
    dependent_upon: subtask?.dependent_upon ?? [],
    planning_notes: subtask?.planning_notes ?? '',
    acceptance_criteria: subtask?.acceptance_criteria ?? [],
    relevant_documentation: subtask?.relevant_documentation ?? [],
    implementation_notes: subtask?.implementation_notes ?? ''
  };

  const [formData, setFormData] = useState(initialFormData);

  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

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
      const updates = {
        title: formData.title,
        description: formData.description,
        details: formData.details,
        effort_estimation_hours: formData.effort_estimation_hours,
        dependent_upon: formData.dependent_upon,
        planning_notes: formData.planning_notes,
        acceptance_criteria: formData.acceptance_criteria,
        relevant_documentation: formData.relevant_documentation,
        implementation_notes: formData.implementation_notes
      };

      if (isEditing) {
        await updateSubtask.mutateAsync({
          storyId,
          subtaskId: subtask.id,
          updates
        });
      } else {
        await createSubtask.mutateAsync({
          storyId,
          ...updates
        });
      }
      setIsDirty(false); // Clear dirty flag on successful save
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    }
  };

  const isLoading = createSubtask.isPending || updateSubtask.isPending;

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      title={isEditing ? `Edit Subtask: ${subtask.id}` : 'Create New Subtask'}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Parent Story Info */}
        {parentStory && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
            <div className="flex items-center space-x-2">
              <Link className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">Parent Story</div>
                <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {parentStory.id} - {parentStory.title}
                </div>
              </div>
            </div>
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
            placeholder="Enter subtask title..."
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
            placeholder="Describe the subtask (markdown supported)..."
            disabled={isLoading}
            rows={4}
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
              <SubtaskDependencyAutocomplete
                subtasks={availableSubtasks}
                onSelect={(subtaskId) => {
                  if (!formData.dependent_upon.includes(subtaskId)) {
                    setFormData({ ...formData, dependent_upon: [...formData.dependent_upon, subtaskId] });
                  }
                }}
                excludeIds={subtask ? [subtask.id, ...formData.dependent_upon] : formData.dependent_upon}
                placeholder="Search for dependency..."
              />
            )}
            renderItem={(depId) => {
              const depSubtask = availableSubtasks.find(s => s.id === depId);
              return depSubtask ? `${depId}: ${depSubtask.title}` : depId;
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

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading} className="flex items-center space-x-2">
            <Save className="h-4 w-4" />
            <span>{isEditing ? 'Update Subtask' : 'Create Subtask'}</span>
          </Button>
        </div>
      </form>

      <UnsavedChangesModal
        isOpen={showUnsavedWarning}
        onClose={handleCancelClose}
        onConfirm={handleConfirmClose}
      />
    </Modal>
  );
}
