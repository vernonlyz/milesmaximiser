import { ReactNode } from 'react'

// Unified pill/chip. `selectable` chips (filters) use the active/idle tones; static
// chips use a tone. Keeps padding/shape/size consistent everywhere.
type Tone = 'gray' | 'indigo' | 'emerald' | 'amber' | 'red'

const toneClass: Record<Tone, string> = {
  gray:    'bg-gray-100 text-gray-600',
  indigo:  'bg-indigo-100 text-indigo-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber:   'bg-amber-100 text-amber-700',
  red:     'bg-red-100 text-red-700',
}

export default function Chip({
  children, tone = 'gray', active, onClick, className = '',
}: {
  children: ReactNode
  tone?: Tone
  active?: boolean          // for filter chips: overrides tone with the active/idle look
  onClick?: () => void
  className?: string
}) {
  const base = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium'
  const look = active === undefined
    ? toneClass[tone]
    : active ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  const interactive = onClick ? 'transition-colors cursor-pointer' : ''
  if (onClick) return <button type="button" onClick={onClick} className={`${base} ${look} ${interactive} ${className}`}>{children}</button>
  return <span className={`${base} ${look} ${className}`}>{children}</span>
}
