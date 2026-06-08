interface Props {
  label: string
  spent: number
  limit: number
  period: string
}

export default function CapUsageBar({ label, spent, limit, period }: Props) {
  const pct = Math.min((spent / limit) * 100, 100)
  const remaining = Math.max(limit - spent, 0)

  const color =
    pct >= 100 ? 'bg-red-500' :
    pct >= 75  ? 'bg-amber-500' :
                 'bg-emerald-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-1 text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500 text-xs capitalize">{period}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>S${spent.toFixed(2)} spent</span>
        <span>{pct >= 100 ? 'Cap reached' : `S$${remaining.toFixed(2)} left`}</span>
      </div>
    </div>
  )
}
