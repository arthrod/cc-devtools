import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';
import { Input } from '../shared/FormField.js';
import { ArrayFieldInput } from '../shared/ArrayFieldInput.js';
import { Tabs } from '../shared/Tabs.js';
import type { PerFileRunnerConfig } from '../../../../web/shared/types/per-file-runner.js';
import { useCreateConfig, useUpdateConfig, usePreviewFiles } from '../../hooks/usePerFileRunner.js';
import { useSystemInfo } from '../../hooks/useSystemInfo.js';

interface ConfigFormProps {
  config?: PerFileRunnerConfig;
  onClose: () => void;
}

/**
 * Form modal for creating and editing per-file-runner configs.
 * Organizes fields into tabs for better UX.
 */
export function ConfigForm({ config, onClose }: ConfigFormProps): JSX.Element {
  const isEditing = !!config;
  const createConfig = useCreateConfig();
  const updateConfig = useUpdateConfig();
  const { data: systemInfo } = useSystemInfo();

  const getDefaultCommand = (): string => {
    if (config?.command) {
      return config.command;
    }
    if (systemInfo?.homeDir) {
      return `${systemInfo.homeDir}/.claude/local/claude`;
    }
    return '~/.claude/local/claude';
  };

  const initialFormData = {
    id: config?.id ?? '',
    name: config?.name ?? '',
    priority: config?.priority ?? 1,
    prompt: config?.prompt ?? '',
    command: getDefaultCommand(),
    args: config?.args ?? ['-p', '___PROMPT___'],
    timeout: config?.timeout ?? 300000,
    glob: {
      include: config?.glob.include ?? ['**/*.ts'],
      exclude: config?.glob.exclude ?? ['node_modules/**', '**/*.test.ts'],
    },
  };

  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Preview files based on current glob patterns
  const { data: previewData, isLoading: isPreviewLoading } = usePreviewFiles(
    formData.glob.include,
    formData.glob.exclude,
    activeTab === 'files' // Only fetch when on files tab
  );

  useEffect(() => {
    const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    setIsDirty(hasChanges);
  }, [formData, initialFormData]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');

    if (!formData.id.trim()) {
      setError('ID is required');
      setActiveTab('basic');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(formData.id)) {
      setError('ID must contain only lowercase letters, numbers, and hyphens');
      setActiveTab('basic');
      return;
    }

    if (!formData.name.trim()) {
      setError('Name is required');
      setActiveTab('basic');
      return;
    }

    if (formData.priority < 1) {
      setError('Priority must be at least 1');
      setActiveTab('basic');
      return;
    }

    if (!formData.prompt.trim()) {
      setError('Prompt is required');
      setActiveTab('prompt');
      return;
    }

    if (!formData.prompt.includes('{filename}')) {
      setError('Prompt must contain {filename} placeholder');
      setActiveTab('prompt');
      return;
    }

    if (!formData.command.trim()) {
      setError('Command is required');
      setActiveTab('command');
      return;
    }

    if (!formData.args.some((arg) => arg.includes('___PROMPT___'))) {
      setError('Arguments must contain ___PROMPT___ placeholder');
      setActiveTab('command');
      return;
    }

    if (formData.timeout < 1000) {
      setError('Timeout must be at least 1000ms (1 second)');
      setActiveTab('command');
      return;
    }

    if (formData.glob.include.length === 0) {
      setError('At least one include pattern is required');
      setActiveTab('files');
      return;
    }

    try {
      const configData: PerFileRunnerConfig = {
        id: formData.id,
        name: formData.name,
        priority: formData.priority,
        prompt: formData.prompt,
        command: formData.command,
        args: formData.args,
        timeout: formData.timeout,
        glob: {
          include: formData.glob.include,
          exclude: formData.glob.exclude,
        },
      };

      if (isEditing) {
        await updateConfig.mutateAsync({ id: config.id, updates: configData });
      } else {
        await createConfig.mutateAsync(configData);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'prompt', label: 'Prompt' },
    { id: 'command', label: 'Command' },
    { id: 'files', label: 'Files' },
  ];

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Edit Config' : 'New Config'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 text-sm text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-4">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ID <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  placeholder="my-config"
                  disabled={isEditing}
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Unique identifier (lowercase letters, numbers, hyphens only). Cannot be changed after creation.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Add Type Annotations"
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Display name for this config.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value, 10) || 1 })}
                  min={1}
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Execution priority (lower numbers run first). Minimum: 1.
                </p>
              </div>
            </div>
          )}

          {/* Prompt Tab */}
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prompt Template <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                  placeholder="Add type annotations to {filename}"
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Template for prompts. Must include <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{'{filename}'}</code> placeholder.
                </p>
              </div>
            </div>
          )}

          {/* Command Tab */}
          {activeTab === 'command' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Command <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.command}
                  onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                  placeholder="claude"
                  className="w-full font-mono"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Command to execute (e.g., claude, node, python).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Arguments <span className="text-red-500">*</span>
                </label>
                <ArrayFieldInput
                  values={formData.args}
                  onAdd={(value) => setFormData({ ...formData, args: [...formData.args, value] })}
                  onRemove={(index) =>
                    setFormData({ ...formData, args: formData.args.filter((_, i) => i !== index) })
                  }
                  placeholder="Add argument..."
                  itemVariant="list-item"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Command arguments. Must include <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">___PROMPT___</code> placeholder.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Timeout (ms) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.timeout}
                  onChange={(e) => setFormData({ ...formData, timeout: parseInt(e.target.value, 10) || 300000 })}
                  min={1000}
                  step={1000}
                  className="w-full"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Maximum execution time per file in milliseconds. Default: 300000 (5 minutes).
                </p>
              </div>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Include Patterns <span className="text-red-500">*</span>
                </label>
                <ArrayFieldInput
                  values={formData.glob.include}
                  onAdd={(value) =>
                    setFormData({
                      ...formData,
                      glob: { ...formData.glob, include: [...formData.glob.include, value] },
                    })
                  }
                  onRemove={(index) =>
                    setFormData({
                      ...formData,
                      glob: { ...formData.glob, include: formData.glob.include.filter((_, i) => i !== index) },
                    })
                  }
                  placeholder="**/*.ts"
                  itemVariant="list-item"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Glob patterns for files to include (e.g., **/*.ts, src/**/*.js).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Exclude Patterns
                </label>
                <ArrayFieldInput
                  values={formData.glob.exclude ?? []}
                  onAdd={(value) =>
                    setFormData({
                      ...formData,
                      glob: { ...formData.glob, exclude: [...(formData.glob.exclude ?? []), value] },
                    })
                  }
                  onRemove={(index) =>
                    setFormData({
                      ...formData,
                      glob: { ...formData.glob, exclude: formData.glob.exclude?.filter((_, i) => i !== index) ?? [] },
                    })
                  }
                  placeholder="**/*.test.ts"
                  itemVariant="list-item"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Glob patterns for files to exclude (optional).
                </p>
              </div>

              {/* Live Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Preview ({isPreviewLoading ? 'Loading...' : `${previewData?.count ?? 0} files`})
                </label>
                <textarea
                  value={isPreviewLoading ? 'Loading...' : previewData?.files.join('\n') ?? ''}
                  readOnly
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-xs resize-none"
                  placeholder="Files matching your patterns will appear here..."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Live preview of files that match your include/exclude patterns.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={<Save className="w-4 h-4" />}
            disabled={createConfig.isPending || updateConfig.isPending || !isDirty}
          >
            {createConfig.isPending || updateConfig.isPending ? 'Saving...' : 'Save Config'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
