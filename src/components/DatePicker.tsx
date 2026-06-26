import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function parse(v: string): Date | null {
  if (!v) return null
  const [y, m, d] = v.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}
function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function fmt(d: Date): string {
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function dayStart(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }

interface Props {
  value: string                       // 'YYYY-MM-DD' or ''
  onChange: (v: string) => void
  min?: string
  max?: string
  placeholder?: string
  clearable?: boolean
  bare?: boolean                      // borderless inline trigger (e.g. "as of <date>")
  className?: string                  // applied to the trigger button (set width here)
}

const PANEL_W = 256
const PANEL_H = 322

export default function DatePicker({ value, onChange, min, max, placeholder = 'Select date', clearable, bare, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const selected = parse(value)
  const [view, setView] = useState(() => selected ?? new Date())
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Keep the visible month in sync when the value changes externally.
  useEffect(() => { if (selected) setView(selected) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [value])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    const onScroll = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  function toggle() {
    if (open) { setOpen(false); return }
    const r = btnRef.current!.getBoundingClientRect()
    let left = r.left
    let top = r.bottom + 4
    if (left + PANEL_W > window.innerWidth - 8) left = Math.max(8, window.innerWidth - PANEL_W - 8)
    if (top + PANEL_H > window.innerHeight - 8) top = Math.max(8, r.top - PANEL_H - 4) // flip above
    setView(selected ?? new Date())
    setCoords({ top, left })
    setOpen(true)
  }

  const minD = min ? parse(min) : null
  const maxD = max ? parse(max) : null
  const today = new Date()

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1)
    const offset = first.getDay()
    return Array.from({ length: 42 }, (_, i) => new Date(view.getFullYear(), view.getMonth(), 1 - offset + i))
  }, [view])

  function disabled(d: Date) {
    if (minD && dayStart(d) < dayStart(minD)) return true
    if (maxD && dayStart(d) > dayStart(maxD)) return true
    return false
  }
  function pick(d: Date) { onChange(iso(d)); setOpen(false) }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={`${bare
          ? 'inline-flex items-center gap-1 text-left'
          : 'flex items-center gap-2 text-left bg-white px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition'
        } ${className}`}
      >
        <Calendar size={bare ? 11 : 14} className="text-gray-400 shrink-0" />
        <span className={selected ? (bare ? '' : 'text-gray-800') : 'text-gray-400'}>
          {selected ? fmt(selected) : placeholder}
        </span>
      </button>

      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: PANEL_W }}
          className="z-[70] bg-white border border-gray-200 rounded-xl shadow-xl p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold text-gray-800">{MONTHS[view.getMonth()]} {view.getFullYear()}</span>
            <button type="button" onClick={() => setView(v => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"><ChevronRight size={16} /></button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WD.map((w, i) => <span key={i} className="text-[10px] font-semibold text-gray-400 py-1">{w}</span>)}
            {days.map((d, i) => {
              const inMonth = d.getMonth() === view.getMonth()
              const isSel = selected != null && sameDay(d, selected)
              const isToday = sameDay(d, today)
              const dis = disabled(d)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={dis}
                  onClick={() => pick(d)}
                  className={`text-xs h-8 rounded-lg transition-colors ${
                    isSel ? 'bg-indigo-600 text-white font-semibold'
                      : dis ? 'text-gray-200 cursor-not-allowed'
                        : inMonth ? 'text-gray-700 hover:bg-indigo-50'
                          : 'text-gray-300 hover:bg-gray-50'
                  } ${isToday && !isSel ? 'ring-1 ring-indigo-300' : ''}`}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={() => pick(new Date())} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Today</button>
            {clearable && <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
