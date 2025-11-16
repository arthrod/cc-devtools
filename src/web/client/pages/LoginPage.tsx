import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/shared/FormField';
import { Button } from '../components/common/Button';

/**
 * Login page for authentication.
 *
 * Features:
 * - Auto-login when token is in URL (QR code scan flow)
 * - Manual token entry field for desktop users
 * - Loading and error states
 */
export function LoginPage(): JSX.Element {
  const { login, isLoading, error } = useAuth();
  const [manualToken, setManualToken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!manualToken.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      await login(manualToken.trim());
    } catch {
      // Error is handled by useAuth hook
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
          <p className="text-neutral-600 dark:text-neutral-400">
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            CC-DevTools
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Web Interface
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Authentication Required
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Scan the QR code displayed in your terminal or enter the token manually below.
            </p>
          </div>

          {error && (
            <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-md p-4">
              <p className="text-sm text-error-700 dark:text-error-400">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="token"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
              >
                Authentication Token
              </label>
              <Input
                id="token"
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Enter your token here"
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting || !manualToken.trim()}
              loading={submitting}
              className="w-full"
            >
              {submitting ? 'Authenticating...' : 'Login'}
            </Button>
          </form>

          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
              The token is displayed in your terminal when you run{' '}
              <code className="px-1 py-0.5 bg-neutral-100 dark:bg-neutral-700 rounded">
                npx cc-devtools web
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
