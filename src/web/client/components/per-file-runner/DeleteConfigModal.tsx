import { AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal.js';
import { Button } from '../common/Button.js';

interface DeleteConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  configName: string | null;
  isDeleting: boolean;
}

/**
 * Confirmation modal for deleting a config
 */
export function DeleteConfigModal({
  isOpen,
  onClose,
  onConfirm,
  configName,
  isDeleting,
}: DeleteConfigModalProps): JSX.Element {
  if (!configName) return <></>;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Config" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Are you sure you want to delete the config <strong>"{configName}"</strong>?
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This will remove the config but preserve file state history. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Config'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
