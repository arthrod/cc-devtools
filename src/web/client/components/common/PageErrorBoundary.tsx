import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../shared/Button';

/** Tracks error boundary state including caught errors and diagnostic information */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/** Props for the PageErrorBoundary component */
interface PageErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Page-level error boundary that catches JavaScript errors in component tree
 * and displays fallback UI.
 *
 * Prevents application crashes by isolating errors to specific page subtrees.
 * In development, shows detailed error information for debugging.
 *
 * Features:
 * - Catches rendering errors in child components
 * - Provides retry mechanism without full page reload
 * - Shows error message with actionable recovery options
 * - Displays stack trace in development mode
 */
export class PageErrorBoundary extends Component<PageErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: PageErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /** Updates state when error occurs, triggering error UI render */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  /** Captures error details and logs to console for debugging */
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('PageErrorBoundary caught an error:', error.message, error.stack, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  /** Resets error state to retry rendering child components */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Something went wrong
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  An unexpected error occurred in the application.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                onClick={this.handleReset}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </Button>

              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>

            {/* Show detailed error information only in development for debugging */}
            {process.env['NODE_ENV'] === 'development' && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-40">
                  {this.state.error?.stack}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
