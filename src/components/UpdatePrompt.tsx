import { useEffect, useState } from 'react'
import { Workbox } from 'workbox-window'
import { RefreshCw, X } from 'lucide-react'

export default function UpdatePrompt() {
  const [show, setShow] = useState(false)
  const [wb, setWb] = useState<Workbox | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || import.meta.env.DEV) return

    const workbox = new Workbox('/sw.js')

    // A new SW has installed and is waiting to activate
    workbox.addEventListener('waiting', () => setShow(true))

    workbox.register()
    setWb(workbox)

    // Poll for updates every hour while the tab is open
    const timer = setInterval(() => workbox.update(), 60 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  function handleUpdate() {
    if (!wb) return
    wb.addEventListener('controlling', () => window.location.reload())
    wb.messageSkipWaiting()
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl max-w-sm w-[calc(100%-2rem)]">
      <RefreshCw size={15} className="shrink-0 text-indigo-400" />
      <span className="flex-1">A new version is available.</span>
      <button
        onClick={handleUpdate}
        className="px-3 py-1 bg-indigo-500 hover:bg-indigo-400 rounded-lg font-medium transition-colors shrink-0"
      >
        Update
      </button>
      <button onClick={() => setShow(false)} className="text-gray-400 hover:text-white shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}
