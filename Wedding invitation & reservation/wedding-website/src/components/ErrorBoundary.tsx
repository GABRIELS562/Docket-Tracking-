import React, { Component, type ReactNode } from 'react';
import { trackErrorBoundary } from '../utils/analytics';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  eventId?: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to analytics and monitoring services
    trackErrorBoundary(error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Generate a unique event ID for error reporting
    const eventId = Math.random().toString(36).substring(2, 15);
    
    this.setState({
      error,
      errorInfo,
      eventId
    });
    
    // Log detailed error information in development
    if (import.meta.env.DEV) {
      console.error('Error Boundary caught an error:', error);
      console.error('Error Info:', errorInfo);
    }
    
    // Report to external monitoring service
    this.reportError(error, errorInfo, eventId);
  }

  private reportError = async (error: Error, errorInfo: React.ErrorInfo, eventId: string) => {
    try {
      // Send to error monitoring service (Sentry, LogRocket, etc.)
      if (import.meta.env.VITE_SENTRY_DSN) {
        // Example Sentry integration
        console.log('Would send to Sentry:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          eventId,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        });
      }
      
      // Send to custom error endpoint
      if (import.meta.env.VITE_ERROR_ENDPOINT) {
        await fetch(import.meta.env.VITE_ERROR_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: {
              message: error.message,
              stack: error.stack,
              name: error.name
            },
            errorInfo: {
              componentStack: errorInfo.componentStack
            },
            eventId,
            metadata: {
              url: window.location.href,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
              buildVersion: import.meta.env.VITE_APP_VERSION || 'unknown'
            }
          }),
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    // Reset error boundary state
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      eventId: undefined
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private copyErrorInfo = () => {
    const { error, errorInfo, eventId } = this.state;
    
    const errorText = `
Error ID: ${eventId}
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
Timestamp: ${new Date().toISOString()}
    `.trim();
    
    navigator.clipboard.writeText(errorText).then(() => {
      alert('Error information copied to clipboard. Please share this with support.');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Error information copied to clipboard. Please share this with support.');
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="max-w-md w-full">
            <CardContent className="p-8 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg 
                    className="w-8 h-8 text-red-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
                    />
                  </svg>
                </div>
                
                <h2 className="heading-tertiary mb-3 text-gray-800">
                  Oops! Something went wrong
                </h2>
                
                <p className="body-base text-gray-600 mb-6">
                  We're sorry, but there was an unexpected error on our wedding website. 
                  Don't worry - this has been automatically reported and we'll fix it soon!
                </p>
                
                {this.state.eventId && (
                  <p className="body-small text-gray-500 mb-6">
                    Error ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                      {this.state.eventId}
                    </code>
                  </p>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="primary" 
                    onClick={this.handleRetry}
                    className="flex-1"
                  >
                    Try Again
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={this.handleReload}
                    className="flex-1"
                  >
                    Reload Page
                  </Button>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={this.copyErrorInfo}
                  className="w-full"
                >
                  Copy Error Details
                </Button>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="body-small text-gray-500">
                  If the problem persists, please contact us at{' '}
                  <a 
                    href="mailto:support@sarah-michael-wedding.com" 
                    className="text-primary hover:text-primary-hover underline"
                  >
                    support@sarah-michael-wedding.com
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<Props>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ErrorBoundary;