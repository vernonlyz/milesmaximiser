import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  /** Optional custom fallback. If omitted, a default card with retry/reload is shown. */
  fallback?: ReactNode
}
interface State {
  hasError: boolean
  error: Error | null
}

// Catches render-time crashes and failed lazy-chunk loads (which otherwise show a
// blank screen). A failed dynamic import on a flaky/updated deploy throws here, so
// the primary action is a full reload (fetches the fresh chunk); "Try again" just
// re-renders for transient errors.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error)
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback

    const msg = String(this.state.error?.message ?? '')
    // Dynamic-import failures (e.g. a stale chunk after a deploy) are best fixed by reloading.
    const isChunkError = /Loading chunk|dynamically imported module|Failed to fetch/i.test(msg)

    return (
      <div className="flex items-center justify-center py-16 px-4">
        <div className="card p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={22} className="text-amber-500" />
          </div>
          <h2 className="font-semibold text-gray-900">Something went wrong</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isChunkError
              ? 'A new version may have been deployed. Reload to get the latest.'
              : 'This page hit an unexpected error. Try again, or reload the app.'}
          </p>
          <div className="flex gap-2 justify-center mt-4">
            {!isChunkError && (
              <button onClick={this.reset} className="btn-secondary text-sm">Try again</button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="btn-primary text-sm inline-flex items-center gap-1.5"
            >
              <RefreshCw size={14} /> Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
