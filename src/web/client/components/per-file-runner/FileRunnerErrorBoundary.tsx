import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button.js';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component for File Runner page.
 * Catches React errors and displays a fallback UI with recovery options.
 */
export class FileRunnerErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    console.error('FileRunner Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallbackTitle = 'File Runner Error' } = this.props;
      const { error, errorInfo } = this.state;

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg shadow-lg p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{fallbackTitle}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Something went wrong while rendering this component. You can try recovering or reload the page.
                  </p>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-4">
                      <div className="text-xs font-mono text-red-900 dark:text-red-100 mb-2 font-semibold">
                        {error.toString()}
                      </div>
                      {errorInfo?.componentStack && (
                        <details className="mt-2">
                          <summary className="text-xs text-red-700 dark:text-red-300 cursor-pointer hover:underline">
                            Component Stack
                          </summary>
                          <pre className="text-xs text-red-800 dark:text-red-200 mt-2 overflow-x-auto whitespace-pre-wrap">
                            {errorInfo.componentStack}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      onClick={this.handleReset}
                      variant="primary"
                      icon={<RefreshCw className="w-4 h-4" />}
                      className="flex-1"
                    >
                      Try Again
                    </Button>
                    <Button onClick={this.handleReload} variant="secondary" className="flex-1">
                      Reload Page
                    </Button>
                  </div>

                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    If this error persists, please report it with the error details above.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
