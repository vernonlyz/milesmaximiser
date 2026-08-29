import { useState, useMemo } from 'react'
import { Sparkles, Trophy, ChevronDown, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import StatusBadge from '../components/StatusBadge'
import PartialBonusNote from '../components/PartialBonusNote'
import VendorInput from '../components/VendorInput'
import { recommendCards, MccContext } from '../lib/recommendations'
import { formatSGD } from '../lib/utils'
import { CardRecommendation, Vendor, CreditCard } from '../lib/types'
import { resolveMccEligibility, chosenCategoryLabels, MccEligibility } from '../lib/mcc'
import MccInfo from '../components/MccInfo'

export default function Recommend() {
  const { cards, categories, rates, caps, transactions, overrides, statementDays, boosts, mccCatalogue, vendorCatalogue, cardMccEligibility } = useApp()

  const [categoryId, setCategoryId] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [paymentChannel, setPaymentChannel] = useState<'contactless' | 'online' | null>(null)

  // Vendor / MCC state
  const [vendorName, setVendorName] = useState('')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [mcc, setMcc] = useState('')

  const amount = parseFloat(amountStr) || 0

  // Level-2 MCC context (see Transactions): trusted when user-typed, or the
  // supplying vendor is tagged 'confirmed'/'likely'; only 'unverified' vendor MCCs
  // are distrusted → the engine then uses the category.
  const mccContext = useMemo<MccContext | undefined>(() => {
    const code = mcc.trim()
    if (!code) return undefined
    const fromVendor = !!selectedVendor && selectedVendor.default_mcc === code
    const confirmed = fromVendor ? selectedVendor!.mcc_confidence !== 'unverified' : true
    const categoryId = mccCatalogue.find(m => m.code === code)?.default_category_id ?? null
    return { code, confirmed, rows: cardMccEligibility, categories, categoryId }
  }, [mcc, selectedVendor, cardMccEligibility, categories, mccCatalogue])

  const recs = useMemo<CardRecommendation[]>(() => {
    if (!categoryId || amount <= 0) return []
    return recommendCards(cards, rates, caps, categoryId, amount, transactions, new Date(), overrides, paymentChannel, statementDays, boosts, mccContext)
  }, [cards, rates, caps, categoryId, amount, transactions, overrides, paymentChannel, statementDays, boosts, mccContext])

  const cat = categories.find(c => c.id === categoryId)
  const mccDescription = mcc ? mccCatalogue.find(m => m.code === mcc)?.description : undefined

  // Level-1 MCC eligibility hint per card (silent for cards without an eligibility model).
  const mccEligFor = (card: CreditCard): MccEligibility | null => {
    if (mcc.length !== 4) return null
    const r = resolveMccEligibility(card, mcc, cardMccEligibility, paymentChannel, chosenCategoryLabels(card, overrides, categories))
    return r.state === 'nodata' ? null : r
  }

  // Standalone MCC check across the wallet — used when an MCC is entered but no
  // category/amount yet (so the ranked results aren't shown).
  const mccCheck = useMemo(() => {
    if (mcc.length !== 4) return []
    const order = { eligible: 0, reduced: 1, ineligible: 2, nodata: 3 }
    return cards
      .filter(c => c.mcc_mode)
      .map(c => ({ card: c, r: resolveMccEligibility(c, mcc, cardMccEligibility, paymentChannel, chosenCategoryLabels(c, overrides, categories)) }))
      .sort((a, z) => order[a.r.state] - order[z.r.state] || a.card.name.localeCompare(z.card.name))
  }, [mcc, cards, cardMccEligibility, paymentChannel, overrides, categories])

  function handleVendorSelect(vendor: Vendor) {
    setVendorName(vendor.name)
    setSelectedVendor(vendor)
    if (vendor.default_category_id) setCategoryId(vendor.default_category_id)
    setMcc(vendor.default_mcc ?? '')
  }

  function handleVendorClear() {
    setVendorName('')
    setSelectedVendor(null)
    setMcc('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Card Recommender</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Find the best card to maximise miles, accounting for your current cap usage.
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[2fr_3fr] lg:gap-6 lg:items-start">

      {/* Inputs */}
      <div className="card p-5 space-y-4 mb-6 lg:mb-0">
        {/* Vendor typeahead */}
        <div>
          <label className="label">Vendor <span className="text-gray-500 font-normal text-xs">(optional — auto-fills category)</span></label>
          <VendorInput
            vendorName={vendorName}
            isVendorSelected={selectedVendor !== null}
            vendors={vendorCatalogue}
            onNameChange={name => { setVendorName(name); setSelectedVendor(null); setMcc('') }}
            onSelect={handleVendorSelect}
            onClear={handleVendorClear}
          />
        </div>

        {/* MCC — editable; auto-filled by the vendor, or type one to check eligibility */}
        <div>
          <label className="label">MCC <span className="text-gray-500 font-normal text-xs">(optional — type to check eligibility)</span></label>
          <div className="relative">
            <input
              value={mcc}
              onChange={e => setMcc(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="e.g. 5814"
              inputMode="numeric"
              className="input pr-7"
            />
            {mcc && (
              <button type="button" onClick={() => setMcc('')} title="Clear"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X size={12} /></button>
            )}
          </div>
          {mcc.length === 4 && <p className="text-xs text-gray-500 mt-0.5">{mccDescription ?? 'Unknown MCC'}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Spending Category</label>
            <div className="relative">
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="input appearance-none pr-8"
              >
                <option value="">Select category…</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="label">Amount (S$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {/* Payment method filter */}
        <div>
          <label className="label">
            Payment Method <span className="text-gray-500 font-normal text-xs">(optional — filters channel-specific bonuses)</span>
          </label>
          <div className="flex gap-2">
            {([null, 'contactless', 'online'] as const).map(mode => (
              <button
                key={mode ?? 'any'}
                type="button"
                onClick={() => setPaymentChannel(mode)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  paymentChannel === mode
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {mode === null ? 'Any' : mode === 'contactless' ? 'Tap to pay' : 'Online'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        {categoryId && amount > 0 ? (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide flex items-center gap-1">
              <span className="flex-1">Best cards for {cat?.icon} {cat?.name} · {formatSGD(amount)}</span>
              {mcc.length === 4 && <MccInfo />}
            </h2>

            {recs.map((rec, i) => (
              <RecCard key={rec.card.id} rec={rec} rank={i + 1} amount={amount} mccElig={mccEligFor(rec.card)} />
            ))}
          </div>
        ) : mcc.length === 4 ? (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide flex items-center gap-1">
              <span className="flex-1">MCC {mcc} eligibility{mccDescription ? ` · ${mccDescription}` : ''}</span>
              <MccInfo />
            </h2>
            {mccCheck.length > 0 ? (
              <div className="space-y-3">
                {([['miles', 'Miles cards'], ['cashback', 'Cashback cards']] as const).map(([type, heading]) => {
                  const rows = mccCheck.filter(x => x.card.card_type === type)
                  if (rows.length === 0) return null
                  return (
                    <div key={type}>
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{heading}</p>
                      <div className="card divide-y divide-gray-100">
                        {rows.map(({ card, r }) => (
                          <div key={card.id} className="flex items-start gap-2.5 px-3 py-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ background: card.color }} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800 truncate">{card.bank} {card.name}</p>
                              <p className={`text-xs ${r.state === 'eligible' ? 'text-emerald-600' : r.state === 'reduced' ? 'text-amber-600' : 'text-gray-400'}`}>
                                {r.state === 'eligible' ? <>✓ Eligible{r.label ? ` · ${r.label}` : ''}{r.note ? ` · ${r.note}` : ''}</>
                                  : r.state === 'reduced' ? <>◐ Reduced rate{r.note ? ` · ${r.note}` : ''}</>
                                  : <>✗ Not eligible{r.note ? ` · ${r.note}` : ''}</>}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="card p-6 text-center text-sm text-gray-500">No cards in your wallet have MCC eligibility data.</div>
            )}
            <p className="text-[11px] text-gray-400">Add a category and amount above to also rank cards by miles. MCC matching is indicative — verify with your bank.</p>
          </div>
        ) : (
          <div className="card p-10 text-center border-dashed border-2 border-gray-200">
            <Sparkles size={32} className="text-indigo-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              Select a category and enter an amount to see which card earns the most miles — or enter an MCC to check bonus eligibility across your cards.
            </p>
          </div>
        )}
      </div>

      </div>{/* end lg:grid */}
    </div>
  )
}

function RecCard({ rec, rank, amount, mccElig }: { rec: CardRecommendation; rank: number; amount: number; mccElig: MccEligibility | null }) {
  const isBest = rank === 1

  return (
    <div
      className={`card p-4 transition-all ${
        isBest ? 'ring-2 ring-indigo-500 border-indigo-200' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
            isBest ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {isBest ? <Trophy size={12} /> : rank}
        </div>

        {/* Card colour stripe */}
        <div
          className="w-1 self-stretch rounded-full shrink-0"
          style={{ backgroundColor: rec.card.color }}
        />

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{rec.card.bank} {rec.card.name}</span>
            <StatusBadge status={rec.status} />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{rec.reason}</p>
          {mccElig && mccElig.state !== 'nodata' && (
            mccElig.state === 'eligible'
              ? <p className="text-xs text-emerald-600 mt-0.5">✓ MCC eligible for bonus{mccElig.label ? ` · ${mccElig.label}` : ''}{mccElig.note ? ` — ${mccElig.note}` : ''}</p>
              : <p className="text-xs text-amber-600 mt-0.5">⚠ MCC not eligible for bonus{mccElig.note ? ` — ${mccElig.note}` : ' — likely base rate'}</p>
          )}
        </div>

        {/* MPD + miles */}
        {rec.status === 'locked' ? (
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-indigo-400">
              {rec.bonusMpd.toFixed(2)}
              <span className="text-sm font-normal text-indigo-300 ml-1">mpd</span>
            </p>
            <p className="text-xs text-gray-500">potential</p>
            <p className="text-xs text-gray-500 mt-0.5">{rec.card.base_mpd.toFixed(2)} mpd now</p>
          </div>
        ) : (
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-gray-900">
              {rec.bonusMpd.toFixed(2)}
              <span className="text-sm font-normal text-gray-500 ml-1">mpd</span>
            </p>
            <p className="text-xs text-indigo-600 font-medium">
              +{Math.round(rec.milesEarned).toLocaleString()} miles
            </p>
          </div>
        )}
      </div>

      {/* Min-spend threshold bar — visible for any card with a threshold */}
      {rec.minSpendRequired !== null && rec.totalCardSpent !== null && (
        <div className="mt-3 ml-10">
          <div className="flex justify-between text-xs mb-1">
            {rec.status === 'locked'
              ? <span className="text-gray-500">Min spend to unlock {rec.bonusMpd} mpd</span>
              : <span className="text-emerald-600">Threshold met ✓</span>
            }
            <span className="tabular-nums text-gray-500">
              {formatSGD(Math.min(rec.totalCardSpent, rec.minSpendRequired))} / {formatSGD(rec.minSpendRequired)}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${rec.status === 'locked' ? 'bg-indigo-300' : 'bg-emerald-400'}`}
              style={{
                width: `${Math.min((rec.totalCardSpent / rec.minSpendRequired) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Cap usage bar — visible whenever we have cap data (including locked cards) */}
      {rec.capAmount !== null && rec.capPeriod !== 'per_transaction' && rec.capRemaining !== null && (
        <div className="mt-3 ml-10">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>
              {rec.status === 'locked'
                ? 'Cap tracker'
                : `Cap usage this ${rec.capPeriod?.replace('ly', '')}`}
            </span>
            <span className="tabular-nums">
              {`${formatSGD(rec.capAmount - rec.capRemaining)} / ${formatSGD(rec.capAmount)}`}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                rec.status === 'locked' ? 'bg-gray-300' :
                rec.status === 'capped' ? 'bg-red-400' :
                rec.status === 'partial' ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{
                width: rec.capAmount
                  ? `${Math.min(((rec.capAmount - rec.capRemaining) / rec.capAmount) * 100, 100)}%`
                  : '0%',
              }}
            />
          </div>
        </div>
      )}

      {/* Partial-cap bonus/base split */}
      <div className="ml-10">
        <PartialBonusNote amount={amount} rec={rec} />
      </div>
    </div>
  )
}
