import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Vendor } from '../lib/types'

interface Props {
  vendorName: string
  isVendorSelected: boolean     // true when a catalogue entry is active
  vendors: Vendor[]
  onNameChange: (name: string) => void
  onSelect: (vendor: Vendor) => void
  onClear: () => void
}

export default function VendorInput({
  vendorName,
  isVendorSelected,
  vendors,
  onNameChange,
  onSelect,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const matches = vendorName.length >= 1
    ? vendors
        .filter(v => v.name.toLowerCase().includes(vendorName.toLowerCase()))
        .slice(0, 8)
    : []

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  if (isVendorSelected) {
    return (
      <div className="input flex items-center gap-2 cursor-default">
        <span className="flex-1 text-sm text-gray-800 truncate">{vendorName}</span>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-gray-500 hover:text-gray-600 transition-colors"
          title="Clear vendor"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={vendorName}
        onChange={e => { onNameChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder="e.g. McDonald's, Grab, NTUC FairPrice…"
        className="input w-full"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {matches.map(v => (
            <button
              key={v.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2 transition-colors"
              onMouseDown={() => { onSelect(v); setOpen(false) }}
            >
              <span className="flex-1 font-medium text-gray-800">{v.name}</span>
              {v.default_mcc && (
                <span className="shrink-0 text-xs text-gray-500 font-mono">
                  {v.default_mcc}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
