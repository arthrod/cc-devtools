/**
 * Toast notification configuration for the global app store.
 *
 * Provides consistent user feedback across the application with
 * automatic dismissal and type-based styling.
 */
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
}
