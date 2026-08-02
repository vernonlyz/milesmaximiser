import { useState } from 'react'
import { Info } from 'lucide-react'

// Compact ⓘ affordance: legend for the ✓/◐/✗ MCC glyphs + the "estimates only"
// disclaimer. Hidden until tapped so it never clutters the surrounding UI.
export default function MccInfo({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="About MCC eligibility"
        aria-label="About MCC eligibility"
        className="inline-flex items-center text-gray-400 hover:text-gray-600"
      >
        <Info size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-5 z-20 w-60 text-[11px] leading-snug text-gray-600 bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 space-y-1.5">
          <p className="font-semibold text-gray-700">MCC eligibility</p>
          <p>
            <span className="text-emerald-600 font-medium">✓</span> earns the bonus ·{' '}
            <span className="text-amber-600 font-medium">◐</span> reduced rate ·{' '}
            <span className="text-amber-600 font-medium">✗</span> earns base
          </p>
          <p className="text-gray-500">
            Eligibility is <strong>estimated</strong> from published bank MCC lists and may be inaccurate or out of date. Always do your own due diligence and verify with your bank.
          </p>
        </div>
      )}
    </span>
  )
}
