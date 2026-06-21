import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, Smile } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { resolveRates } from '../lib/recommendations'

export function markOnboarded(userId: string) {
  localStorage.setItem(`onboarded_${userId}`, '1')
}

export function isOnboarded(userId: string): boolean {
  return localStorage.getItem(`onboarded_${userId}`) === '1'
}

export default function Onboarding() {
  const { user } = useAuth()
  const { allCards, rates, categories, addCardSelection } = useApp()
  const navigate = useNavigate()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const today = new Date()

  function toggle(cardId: string) {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(cardId)) next.delete(cardId)
      else next.add(cardId)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(allCards.filter(c => c.active).map(c => c.id)))
  }

  function clearAll() {
    setSelected(new Set())
  }

  async function handleGetStarted() {
    if (!user) return
    setSaving(true)
    // Add all selected cards to wallet (inserts into user_card_selections)
    for (const cardId of selected) {
      await addCardSelection(cardId)
    }
    markOnboarded(user.id)
    setSaving(false)
    navigate('/')
  }

  function skip() {
    if (user) markOnboarded(user.id)
    navigate('/')
  }

  const activeCards = allCards.filter(c => c.active)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Smile size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900">SmileMax</span>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Which cards are in your wallet?</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Select the cards you currently own. You can add or remove cards at any time from <strong>My Cards</strong>.
          </p>
        </div>

        {activeCards.length === 0 ? (
          <div className="card p-10 text-center text-gray-500 text-sm">
            Loading card library…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {activeCards.map(card => {
                const isSelected = selected.has(card.id)
                const cardRates = resolveRates(rates.filter(r => r.card_id === card.id), today)

                return (
                  <button
                    key={card.id}
                    onClick={() => toggle(card.id)}
                    className={`relative rounded-xl p-4 text-left border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-white shadow-md ring-2 ring-indigo-200'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Checkmark */}
                    <div className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>

                    {/* Bank badge */}
                    <div
                      className="w-9 h-9 rounded-lg mb-3 flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: card.color }}
                    >
                      {card.bank.slice(0, 2).toUpperCase()}
                    </div>

                    <p className="font-semibold text-sm text-gray-900 leading-tight">{card.bank}</p>
                    <p className="text-xs text-gray-500 leading-tight mt-0.5 line-clamp-2">{card.name}</p>

                    <div className="mt-2.5 space-y-0.5">
                      {cardRates.slice(0, 2).map(r => {
                        const cat = categories.find(c => c.id === r.category_id)
                        return (
                          <p key={r.id} className="text-xs text-indigo-600 font-medium">
                            {r.mpd} mpd · {cat?.name}
                          </p>
                        )
                      })}
                      <p className="text-xs text-gray-500">{card.base_mpd} mpd base</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex gap-2">
                <button onClick={selectAll} className="btn-secondary text-sm py-1.5">Select all</button>
                <button onClick={clearAll}  className="btn-secondary text-sm py-1.5">Clear</button>
              </div>

              <div className="sm:ml-auto flex items-center gap-4">
                <button onClick={skip} className="text-sm text-gray-500 hover:text-gray-600 transition-colors">
                  Skip for now
                </button>
                <button onClick={handleGetStarted} disabled={saving} className="btn-primary">
                  {saving ? (
                    <><Loader2 size={15} className="animate-spin" /> Setting up…</>
                  ) : selected.size === 0 ? (
                    'Continue without cards →'
                  ) : (
                    `Add ${selected.size} card${selected.size !== 1 ? 's' : ''} & Get Started →`
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
