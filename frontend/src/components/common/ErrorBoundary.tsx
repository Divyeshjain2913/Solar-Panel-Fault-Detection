import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#15191F] border border-[#272D36] rounded-lg p-6 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-center justify-center mx-auto text-[#EF4444]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#E8EDF4]">Component Rendering Error</h2>
              <p className="text-xs text-[#8B95A5] mt-1 font-mono break-words">
                {this.state.error?.message || 'An unexpected rendering error occurred.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1F27] hover:bg-[#272D36] border border-[#272D36] rounded text-xs font-medium text-[#E8EDF4] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry Render
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3B82F6] hover:bg-[#2563EB] rounded text-xs font-medium text-white transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                Return to Dashboard
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
