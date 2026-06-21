import { useMemo, useState } from 'react'
import { Calculator, Info } from 'lucide-react'

const BENCHMARK_CPP = 1.5 // cents per mile

function grade(cpp: number): { label: string; color: string; bar: string; pct: number } {
  if (cpp >= 2.5) return { label: 'Excellent',      color: 'text-indigo-600',  bar: 'bg-indigo-500',  pct: 100 }
  if (cpp >= 2.0) return { label: 'Great',          color: 'text-emerald-600', bar: 'bg-emerald-500', pct: 85  }
  if (cpp >= 1.5) return { label: 'Good',           color: 'text-green-600',   bar: 'bg-green-500',   pct: 65  }
  if (cpp >= 1.0) return { label: 'Below average',  color: 'text-amber-600',   bar: 'bg-amber-400',   pct: 40  }
  return           { label: 'Poor value',           color: 'text-red-500',     bar: 'bg-red-400',     pct: 20  }
}

export default function MileValue() {
  const [price, setPrice]   = useState('')
  const [miles, setMiles]   = useState('')
  const [copay, setCopay]   = useState('')

  const result = useMemo(() => {
    const p = parseFloat(price)
    const m = parseFloat(miles)
    const c = parseFloat(copay) || 0
    if (isNaN(p) || isNaN(m) || p <= 0 || m <= 0) return null
    const covered = Math.max(0, p - c)
    const cpp = (covered / m) * 100
    return { cpp, covered, total: p, copay: c, miles: m }
  }, [price, miles, copay])

  const g = result ? grade(result.cpp) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator size={22} className="text-indigo-500" />
          Mile Value Calculator
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Find out how much each mile is worth on a specific redemption.
        </p>
      </div>

      {/* Inputs */}
      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Retail ticket price (S$)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 1200"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Miles required for redemption
            </label>
            <input
              type="number"
              min="0"
              step="500"
              placeholder="e.g. 50000"
              value={miles}
              onChange={e => setMiles(e.target.value)}
              className="input w-full"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Cash co-payment — taxes &amp; fees (S$) <span className="text-gray-500 font-normal">optional</span>
          </label>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 120"
            value={copay}
            onChange={e => setCopay(e.target.value)}
            className="input w-full sm:w-1/2"
          />
          <p className="text-xs text-gray-500 mt-1">
            Most award tickets still charge taxes and carrier surcharges in cash.
          </p>
        </div>
      </div>

      {/* Result */}
      {result && g && (
        <div className="card p-5 space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Value per mile</p>
              <p className={`text-4xl font-bold mt-0.5 ${g.color}`}>
                {result.cpp.toFixed(2)}¢
              </p>
              <p className="text-sm text-gray-500 mt-0.5">cents per mile</p>
            </div>
            <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
              result.cpp >= BENCHMARK_CPP
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              {g.label}
            </span>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>0¢</span>
              <span className="text-gray-600 font-medium">Benchmark: {BENCHMARK_CPP}¢</span>
              <span>2.5¢+</span>
            </div>
            <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
              {/* Benchmark marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
                style={{ left: `${(BENCHMARK_CPP / 2.5) * 100}%` }}
              />
              <div
                className={`h-full rounded-full transition-all ${g.bar}`}
                style={{ width: `${Math.min(g.pct, 100)}%` }}
              />
            </div>
          </div>

          {/* Breakdown */}
          <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
            <Row label="Retail ticket price"         value={`S$${result.total.toFixed(2)}`} />
            {result.copay > 0 && (
              <Row label="Cash co-payment"           value={`− S$${result.copay.toFixed(2)}`} sub />
            )}
            <Row label="Value covered by miles"      value={`S$${result.covered.toFixed(2)}`} bold />
            <Row label="Miles used"                  value={result.miles.toLocaleString()} />
            <Row label="Effective value per mile"    value={`${result.cpp.toFixed(4)}¢`} />
          </div>
        </div>
      )}

      {/* Benchmark note */}
      <div className="flex items-start gap-2.5 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
        <Info size={14} className="text-indigo-500 mt-0.5 shrink-0" />
        <p className="text-sm text-indigo-700">
          <span className="font-medium">The 1.5¢ benchmark.</span>{' '}
          A mile is widely considered good value when redeemed at 1.5 cents or more. This
          reflects the typical market rate for airline miles transferred to premium programs.
          Redemptions above this threshold — most common in business and first class cabins —
          mean your miles are working harder than their cash equivalent. Below 1.5¢, you may
          get better value paying cash and earning miles on the purchase instead.
        </p>
      </div>
    </div>
  )
}

function Row({ label, value, bold, sub }: { label: string; value: string; bold?: boolean; sub?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={sub ? 'text-gray-500' : 'text-gray-600'}>{label}</span>
      <span className={bold ? 'font-semibold text-gray-900' : sub ? 'text-gray-500' : 'text-gray-700'}>
        {value}
      </span>
    </div>
  )
}
