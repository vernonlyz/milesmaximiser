import { AlertCircle } from 'lucide-react'

// Inline "couldn't load — retry" state, so a failed query isn't mistaken for
// an empty/no-data state.
export default function ErrorState({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="card p-8 text-center space-y-3">
      <AlertCircle size={26} className="text-red-400 mx-auto" />
      <p className="text-sm text-gray-600">{message ?? "Couldn't load this data. Check your connection and try again."}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-xs mx-auto">Retry</button>
      )}
    </div>
  )
}
