import { useRef, useState } from 'react'
import { Info } from 'lucide-react'
import { useClickOutside } from '../lib/useClickOutside'

// Compact ⓘ affordance explaining the vendor→MCC confidence levels. Hidden until
// tapped so it doesn't clutter the log form; works on mobile (no hover needed).
export default function ConfidenceInfo({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useClickOutside(ref, () => setOpen(false), open)
  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="What do these mean?"
        aria-label="MCC confidence explained"
        className="inline-flex items-center text-gray-400 hover:text-gray-600"
      >
        <Info size={13} />
      </button>
      {open && (
        <div className="absolute right-0 top-5 z-20 w-60 text-[11px] leading-snug text-gray-600 bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 space-y-1">
          <p className="font-semibold text-gray-700">MCC confidence</p>
          <p><span className="text-emerald-600 font-medium">Confirmed</span> — verified on a real statement.</p>
          <p><span className="text-gray-600 font-medium">Likely</span> — the expected MCC for this merchant, not yet verified.</p>
          <p><span className="text-amber-600 font-medium">Unverified</span> — a guess; may be inaccurate.</p>
          <p className="text-gray-500 pt-1 border-t border-gray-100">
            All MCCs are <strong>indicative only</strong> — they can vary by merchant/acquirer and change over time. SmileMax is not liable for MCC accuracy; always verify with your bank.
          </p>
        </div>
      )}
    </span>
  )
}
