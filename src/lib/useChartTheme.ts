import { useEffect, useState } from 'react'

// Tracks the live `dark` class on <html> (toggled by the theme switch / system),
// so Recharts colours (passed as props, not CSS) can follow the theme.
export function useIsDark(): boolean {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
  useEffect(() => {
    const el = document.documentElement
    const obs = new MutationObserver(() => setDark(el.classList.contains('dark')))
    obs.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

// Theme-aware Recharts colours: grid stroke, axis tick fill, and the tooltip
// content/item/label styles (Recharts renders the tooltip inline, so it needs
// explicit dark colours).
export function useChartColors() {
  const dark = useIsDark()
  if (dark) return {
    grid: '#374151',
    tick: '#9ca3af',
    tooltip: { fontSize: 12, borderRadius: 8, border: '1px solid #374151', backgroundColor: '#1f2937', color: '#f3f4f6' } as const,
    tooltipItem: { color: '#f3f4f6' } as const,
    tooltipLabel: { color: '#e5e7eb' } as const,
    // The hover cursor (bar highlight rect / line) — default light gray reads as
    // a white block on dark, so use a subtle light-on-dark wash.
    cursor: { fill: 'rgba(148, 163, 184, 0.14)', stroke: '#4b5563' } as const,
  }
  return {
    grid: '#f0f0f0',
    tick: '#9ca3af',
    tooltip: { fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' } as const,
    tooltipItem: {} as const,
    tooltipLabel: {} as const,
    cursor: { fill: 'rgba(0, 0, 0, 0.04)' } as const,
  }
}
