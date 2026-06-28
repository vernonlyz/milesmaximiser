import { useMemo, useState } from 'react'
import { Calculator, Info } from 'lucide-react'

const BENCHMARK_CPP = 1.8 // cents per mile

function grade(cpp: number): { label: string; color: string; bar: string; pct: number } {
  if (cpp >= 2.5) return { label: 'Excellent',      color: 'text-indigo-600',  bar: 'bg-indigo-500',  pct: 100 }
  if (cpp >= 2.0) return { label: 'Great',          color: 'text-emerald-600', bar: 'bg-emerald-500', pct: 85  }
  if (cpp >= 1.8) return { label: 'Good',           color: 'text-green-600',   bar: 'bg-green-500',   pct: 65  }
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

  const [tab, setTab] = useState<'redeem' | 'compare'>('redeem')

  // ── Calculator 2: cheaper (no miles) vs higher price (earns miles) ──
  const [cashPrice, setCashPrice] = useState('')
  const [cardPrice, setCardPrice] = useState('')
  const [earnRate, setEarnRate]   = useState('')
  const [capInput, setCapInput]   = useState('')   // optional bonus cap (S$)
  const [baseRate, setBaseRate]   = useState('')   // optional base mpd beyond the cap
  const [cppInput, setCppInput]   = useState(String(BENCHMARK_CPP))

  const compare = useMemo(() => {
    const cashP = parseFloat(cashPrice)
    const cardP = parseFloat(cardPrice)
    const mpd   = parseFloat(earnRate)
    const cpp   = parseFloat(cppInput)
    if ([cashP, cardP, mpd, cpp].some(v => isNaN(v)) || cashP < 0 || cardP <= 0 || mpd <= 0 || cpp <= 0) return null
    // Optional bonus cap: only spend up to the cap earns the bonus rate; the rest
    // earns the (optional) base rate.
    const cap = parseFloat(capInput)
    const baseMpd = parseFloat(baseRate)
    const hasCap = !isNaN(cap) && cap > 0
    const capAmt = hasCap ? cap : Infinity
    const baseM  = !isNaN(baseMpd) && baseMpd > 0 ? baseMpd : 0
    const bonusSpend = Math.min(cardP, capAmt)
    const overSpend  = Math.max(0, cardP - capAmt)
    const milesEarned = bonusSpend * mpd + overSpend * baseM
    const milesValue  = milesEarned * cpp / 100
    const netCard     = cardP - milesValue          // effective cost paying by card, net of miles value
    const extraCost   = cardP - cashP               // premium paid to earn miles
    const saving      = cashP - netCard             // >0 → card option is cheaper net
    const breakEven   = milesEarned > 0 ? (extraCost / milesEarned) * 100 : null // ¢/mile you're paying
    const cardWins    = netCard < cashP - 0.005
    const capped      = hasCap && overSpend > 0
    return { cashP, cardP, mpd, cpp, bonusSpend, overSpend, baseM, milesEarned, milesValue, netCard, extraCost, saving, breakEven, cardWins, capped }
  }, [cashPrice, cardPrice, earnRate, capInput, baseRate, cppInput])

  // ── Break-even: max card price worth paying vs the cash price (reuses the
  // same card params as the compare tab) ──
  const breakeven = useMemo(() => {
    const cashP = parseFloat(cashPrice)
    const mpd   = parseFloat(earnRate)
    const cpp   = parseFloat(cppInput)
    if ([cashP, mpd, cpp].some(v => isNaN(v)) || cashP <= 0 || mpd <= 0 || cpp <= 0) return null
    const cap = parseFloat(capInput)
    const baseMpd = parseFloat(baseRate)
    const hasCap = !isNaN(cap) && cap > 0
    const baseM = !isNaN(baseMpd) && baseMpd > 0 ? baseMpd : 0
    const r1 = mpd * cpp / 100          // value of miles per $1 within the cap
    if (r1 >= 1) return { unbounded: true, cashP, valueRate: r1 }
    // Solve netCard(price) = cashP. First assume the break-even is within the cap.
    let maxCard = cashP / (1 - r1)
    let overCap = false
    if (hasCap && maxCard > cap) {
      const rb = baseM * cpp / 100      // value per $1 beyond the cap
      if (rb >= 1) return { unbounded: true, cashP, valueRate: r1 }
      maxCard = (cashP + cap * (mpd - baseM) * cpp / 100) / (1 - rb)
      overCap = true
    }
    const premiumPct = (maxCard - cashP) / cashP * 100
    return { unbounded: false, cashP, maxCard, premiumPct, valueRate: r1, hasCap, overCap }
  }, [cashPrice, earnRate, cppInput, capInput, baseRate])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator size={22} className="text-indigo-500" />
          Mile Value Calculator
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {tab === 'redeem'
            ? 'Find out how much each mile is worth on a specific redemption.'
            : 'See the most it’s worth paying on a miles-earning price — and whether a specific price beats a cheaper no-miles one.'}
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-full sm:w-auto sm:inline-flex">
        {([['redeem', 'Redemption value'], ['compare', 'Worth paying more?']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'redeem' && (<>
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
          <span className="font-medium">The 1.8¢ benchmark.</span>{' '}
          A mile is widely considered good value when redeemed at 1.8 cents or more. This
          reflects the typical market rate for airline miles transferred to premium programs.
          Redemptions above this threshold — most common in business and first class cabins —
          mean your miles are working harder than their cash equivalent. Below 1.8¢, you may
          get better value paying cash and earning miles on the purchase instead.
        </p>
      </div>
      </>)}

      {tab === 'compare' && (<>
      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Lower price — no miles (S$)
            </label>
            <input
              type="number" min="0" step="1" placeholder="e.g. 980"
              value={cashPrice}
              onChange={e => setCashPrice(e.target.value)}
              className="input w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Cash / bank-transfer / discounted rate.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Higher price — earns miles (S$) <span className="text-gray-400 font-normal">optional</span>
            </label>
            <input
              type="number" min="0" step="1" placeholder="e.g. 1050"
              value={cardPrice}
              onChange={e => setCardPrice(e.target.value)}
              className="input w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank to just see the break-even ceiling.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Earn rate (mpd)
            </label>
            <input
              type="number" min="0" step="0.1" placeholder="e.g. 1.2"
              value={earnRate}
              onChange={e => setEarnRate(e.target.value)}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Your value per mile (¢)
            </label>
            <input
              type="number" min="0" step="0.1"
              value={cppInput}
              onChange={e => setCppInput(e.target.value)}
              className="input w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Defaults to the {BENCHMARK_CPP}¢ benchmark — adjust to how you value miles.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Bonus cap (S$) <span className="text-gray-400 font-normal">optional</span>
            </label>
            <input
              type="number" min="0" step="1" placeholder="uncapped"
              value={capInput}
              onChange={e => setCapInput(e.target.value)}
              className="input w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Spend earning the bonus rate is capped at this; the rest earns the base rate.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Base rate beyond cap (mpd) <span className="text-gray-400 font-normal">optional</span>
            </label>
            <input
              type="number" min="0" step="0.1" placeholder="e.g. 0.4"
              value={baseRate}
              onChange={e => setBaseRate(e.target.value)}
              className="input w-full"
              disabled={!capInput}
            />
            <p className="text-xs text-gray-500 mt-1">Rate earned on spend over the cap (0 if blank).</p>
          </div>
        </div>
      </div>

      {/* Break-even ceiling — shown whenever cash price + rate are set */}
      {breakeven && !breakeven.unbounded && (
        <div className="card p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Worth paying by card up to</p>
          <p className="text-3xl font-bold text-indigo-600 mt-0.5">S${breakeven.maxCard!.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-0.5">
            a {breakeven.premiumPct!.toFixed(1)}% premium over the S${breakeven.cashP.toFixed(2)} cash price
            {breakeven.overCap && ' (over-cap spend valued at base rate)'} · miles worth {(breakeven.valueRate * 100).toFixed(1)}% of spend
          </p>
        </div>
      )}
      {breakeven?.unbounded && (
        <div className="card p-5 text-sm text-emerald-600 font-medium">
          At this rate miles are worth 100% or more of spend — any premium is worth it.
        </div>
      )}

      {compare && (
        <div className="card p-5 space-y-4">
          {/* Verdict */}
          <div className={`rounded-xl px-4 py-3 ${compare.cardWins ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'}`}>
            <p className={`font-semibold ${compare.cardWins ? 'text-emerald-700' : 'text-amber-700'}`}>
              {compare.cardWins
                ? '✅ Pay the higher price and earn miles'
                : '💸 Take the lower price'}
            </p>
            <p className={`text-sm mt-0.5 ${compare.cardWins ? 'text-emerald-700' : 'text-amber-700'}`}>
              {compare.cardWins
                ? `Net cost S$${compare.netCard.toFixed(2)} after miles — S$${compare.saving.toFixed(2)} cheaper than paying S$${compare.cashP.toFixed(2)}.`
                : `Paying S$${compare.extraCost.toFixed(2)} more buys only S$${compare.milesValue.toFixed(2)} of miles — you'd lose S$${Math.abs(compare.saving).toFixed(2)} net.`}
            </p>
          </div>

          {/* Break-even */}
          {compare.breakEven != null && compare.extraCost > 0 && (
            <div className="text-sm text-gray-600">
              You're effectively buying miles at{' '}
              <span className={`font-semibold ${compare.breakEven <= compare.cpp ? 'text-emerald-600' : 'text-amber-600'}`}>
                {compare.breakEven.toFixed(2)}¢ each
              </span>{' '}
              — worth it while you value miles above that ({compare.cpp.toFixed(1)}¢ entered).
            </div>
          )}
          {compare.extraCost <= 0 && (
            <div className="text-sm text-emerald-600 font-medium">The miles-earning price is also cheaper — free miles.</div>
          )}

          {/* Breakdown */}
          <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
            <Row label="Lower price (no miles)"       value={`S$${compare.cashP.toFixed(2)}`} />
            <Row label="Higher price (earns miles)"   value={`S$${compare.cardP.toFixed(2)}`} />
            {compare.capped ? (
              <>
                <Row label={`${compare.mpd} mpd on S$${compare.bonusSpend.toFixed(2)} (within cap)`} value={`${Math.round(compare.bonusSpend * compare.mpd).toLocaleString()} mi`} sub />
                <Row label={`${compare.baseM} mpd on S$${compare.overSpend.toFixed(2)} (over cap)`} value={`${Math.round(compare.overSpend * compare.baseM).toLocaleString()} mi`} sub />
                <Row label="Total miles earned" value={`${Math.round(compare.milesEarned).toLocaleString()} mi`} />
              </>
            ) : (
              <Row label={`Miles earned (${compare.mpd} mpd)`} value={`${Math.round(compare.milesEarned).toLocaleString()} mi`} sub />
            )}
            <Row label={`Miles value @ ${compare.cpp.toFixed(1)}¢`} value={`− S$${compare.milesValue.toFixed(2)}`} sub />
            <Row label="Net cost paying by card"      value={`S$${compare.netCard.toFixed(2)}`} bold />
          </div>
        </div>
      )}
      </>)}

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
