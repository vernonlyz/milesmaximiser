import { useMemo } from 'react'
import { Check, Plus, Minus, Info } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { resolveRates, resolveCaps } from '../lib/recommendations'
import { capPeriodLabel } from '../lib/utils'
import { CreditCard } from '../lib/types'

export default function Cards() {
  const { allCards, selectedCardIds, categories, rates, caps, addCardSelection, removeCardSelection } = useApp()

  const today = useMemo(() => new Date(), [])

  // Group library cards by bank
  const grouped = useMemo(() => {
    const map = new Map<string, CreditCard[]>()
    for (const card of allCards.filter(c => c.active)) {
      const list = map.get(card.bank) ?? []
      list.push(card)
      map.set(card.bank, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [allCards])

  const walletCount = selectedCardIds.size

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Cards</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {walletCount} card{walletCount !== 1 ? 's' : ''} in your wallet
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          Rates and caps are maintained centrally and kept up to date.
          Toggle cards below to add or remove them from your wallet.
        </p>
      </div>

      {/* Library grouped by bank */}
      {grouped.map(([bank, bankCards]) => (
        <div key={bank}>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{bank}</h2>
          <div className="space-y-3">
            {bankCards.map(card => {
              const cardRates = resolveRates(rates.filter(r => r.card_id === card.id), today)
              const cardCaps  = resolveCaps(caps.filter(c => c.card_id === card.id), today)
              const inWallet  = selectedCardIds.has(card.id)

              return (
                <div
                  key={card.id}
                  className={`card p-5 transition-all ${inWallet ? 'ring-2 ring-indigo-400 border-indigo-200' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Bank colour badge */}
                    <div
                      className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: card.color }}
                    >
                      {card.bank.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{card.bank} {card.name}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          {card.card_network}
                        </span>
                        {inWallet && (
                          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check size={10} /> In Wallet
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-500 mt-0.5">Base rate: {card.base_mpd} mpd</p>

                      {/* Bonus rates */}
                      {cardRates.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {cardRates.map(r => {
                            const cat = categories.find(c => c.id === r.category_id)
                            return (
                              <span key={r.id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
                                {cat?.icon} {cat?.name}: {r.mpd} mpd
                                <span className="text-indigo-400 ml-1 text-[10px]">since {r.effective_from}</span>
                              </span>
                            )
                          })}
                        </div>
                      )}

                      {/* Caps */}
                      {cardCaps.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {cardCaps.map(c => {
                            const cat = c.category_id ? categories.find(cat => cat.id === c.category_id) : null
                            return (
                              <span key={c.id} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
                                Cap: S${c.spend_limit?.toLocaleString()}/{capPeriodLabel(c.cap_period).toLowerCase()}
                                {cat ? ` (${cat.name})` : ' (all)'}
                                <span className="text-amber-400 ml-1 text-[10px]">since {c.effective_from}</span>
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Wallet toggle */}
                    <div className="shrink-0">
                      {inWallet ? (
                        <button
                          onClick={() => removeCardSelection(card.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Minus size={13} /> Remove
                        </button>
                      ) : (
                        <button
                          onClick={() => addCardSelection(card.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                        >
                          <Plus size={13} /> Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {allCards.length === 0 && (
        <div className="card p-10 text-center border-dashed border-2 border-gray-200">
          <p className="text-gray-400 text-sm">No cards in the library yet.</p>
          <p className="text-gray-400 text-xs mt-1">Ask the admin to seed the card library.</p>
        </div>
      )}
    </div>
  )
}
