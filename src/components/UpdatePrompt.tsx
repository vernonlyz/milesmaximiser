import { useEffect } from 'react'
import { Workbox } from 'workbox-window'

// The service worker is generated with skipWaiting + clientsClaim, so a new
// version activates and claims the page automatically. We just reload once when
// that happens so the page runs the fresh assets. `isUpdate` guards against the
// first-ever install (no previous SW), which must not trigger a reload loop.
export default function UpdatePrompt() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || import.meta.env.DEV) return

    const wb = new Workbox('/sw.js')

    wb.addEventListener('controlling', (event) => {
      if (event.isUpdate) window.location.reload()
    })

    wb.register()

    // Check for a new deployment periodically while the tab stays open.
    const timer = setInterval(() => wb.update(), 60 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  return null
}
