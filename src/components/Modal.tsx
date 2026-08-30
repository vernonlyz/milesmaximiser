import { ReactNode, useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
  // Non-scrolling footer pinned below the scrollable body (e.g. a Save/Cancel bar),
  // so it never overlaps or reveals the form fields behind it.
  footer?: ReactNode
}

export default function Modal({ title, onClose, children, wide, footer }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh] ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-6 space-y-4">{children}</div>
        {footer && <div className="px-6 py-3 border-t border-gray-100 bg-white rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  )
}
