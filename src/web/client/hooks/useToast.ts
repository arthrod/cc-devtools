import { useContext } from 'react';
import { ToastContext } from '../components/common/ToastContainer';
import type { ToastContextValue } from '../components/common/ToastContainer';

/**
 * Hook to access toast notifications
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
