import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription } from './alert';
import { Button } from './button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call the optional onError callback
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] p-6">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="mt-2">
              <div className="space-y-3">
                <div>
                  <strong>Something went wrong</strong>
                </div>
                <div className="text-sm text-muted-foreground">
                  The component encountered an error and couldn't render properly.
                </div>
                {this.state.error && (
                  <details className="text-xs">
                    <summary className="cursor-pointer hover:text-foreground">
                      Show error details
                    </summary>
                    <div className="mt-2 p-2 bg-muted rounded border">
                      <strong>Error:</strong> {this.state.error.message}
                      {this.state.errorInfo?.componentStack && (
                        <div className="mt-1">
                          <strong>Component Stack:</strong>
                          <pre className="whitespace-pre-wrap text-xs">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
                <div className="flex space-x-2">
                  <Button onClick={this.handleReset} size="sm" variant="outline">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Try Again
                  </Button>
                  <Button 
                    onClick={() => window.location.reload()} 
                    size="sm" 
                    variant="secondary"
                  >
                    Reload Page
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;