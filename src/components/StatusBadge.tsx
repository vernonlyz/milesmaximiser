import { CardRecommendation } from '../lib/types'

const config: Record<CardRecommendation['status'], { label: string; className: string }> = {
  optimal:  { label: 'Full bonus',    className: 'bg-emerald-100 text-emerald-700' },
  partial:  { label: 'Partial bonus', className: 'bg-amber-100 text-amber-700'    },
  capped:   { label: 'Cap reached',   className: 'bg-red-100 text-red-700'         },
  base:     { label: 'Base rate',     className: 'bg-gray-100 text-gray-500'       },
  locked:   { label: 'Threshold',     className: 'bg-indigo-100 text-indigo-600'   },
}

export default function StatusBadge({ status }: { status: CardRecommendation['status'] }) {
  const { label, className } = config[status]
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  )
}
