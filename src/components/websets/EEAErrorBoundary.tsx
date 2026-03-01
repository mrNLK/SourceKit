import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class EEAErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[EEAErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
          <AlertTriangle className="w-6 h-6 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">
            {this.props.fallbackMessage || 'Failed to render EEA data'}
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {this.state.error?.message || 'An enrichment result may contain malformed data.'}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-display px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default EEAErrorBoundary;
