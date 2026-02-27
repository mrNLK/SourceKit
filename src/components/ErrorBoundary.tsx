import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { captureException } from '@/lib/sentry'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallback?: ReactNode
  compact?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
    captureException(error, { componentStack: info.componentStack })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      if (this.props.compact) {
        return (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <span className="text-destructive text-sm">
              {this.props.fallbackTitle || 'Failed to load'}
            </span>
            <button
              onClick={this.handleRetry}
              className="px-2 py-1 rounded text-xs bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors"
            >
              Retry
            </button>
          </div>
        )
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div className="w-full max-w-md space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <span className="text-destructive text-xl">!</span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {this.props.fallbackTitle || 'Something went wrong'}
            </h2>
            {this.state.error && (
              <pre className="text-left text-xs text-muted-foreground bg-secondary rounded-lg p-4 overflow-x-auto font-mono whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
