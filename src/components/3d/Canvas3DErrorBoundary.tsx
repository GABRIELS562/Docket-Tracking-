import { Component, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

/**
 * Error boundary specifically for 3D Canvas components
 * Catches WebGL crashes, context lost errors, and React Three Fiber issues
 */
export default class Canvas3DErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console for debugging
    console.error('3D Canvas Error:', error);
    console.error('Component stack:', errorInfo.componentStack);

    // Determine user-friendly error message
    let friendlyMessage = 'An error occurred in the 3D view.';

    if (error.message.includes('WebGL')) {
      friendlyMessage = 'WebGL is not supported or has crashed. Try refreshing the page.';
    } else if (error.message.includes('context')) {
      friendlyMessage = 'Graphics context was lost. This can happen with complex scenes.';
    } else if (error.message.includes('THREE')) {
      friendlyMessage = 'A 3D rendering error occurred.';
    }

    this.setState({ errorInfo: friendlyMessage });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: '' });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="max-w-md text-center p-8 bg-gray-800 rounded-xl border border-red-500/30 shadow-lg">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">3D Visualization Error</h2>

            <p className="text-gray-400 mb-6">{this.state.errorInfo}</p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              >
                Reload Page
              </button>
            </div>

            {/* Show technical details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400">
                  Technical Details
                </summary>
                <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-red-400 overflow-auto max-h-40">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
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
