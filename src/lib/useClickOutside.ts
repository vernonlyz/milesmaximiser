import { useEffect, RefObject } from 'react'

// Calls `onOutside` when a pointerdown lands outside `ref`, or when Escape is
// pressed. Only active while `enabled` (so it doesn't listen when closed).
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  onOutside: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOutside() }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, onOutside, enabled])
}
