import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Loader2, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { STARTER_CARDS } from '../lib/starterCards'

export function markOnboarded(userId: string) {
  localStorage.setItem(`onboarded_${userId}`, '1')
}

export function isOnboarded(userId: string): boolean {
  return localStorage.getItem(`onboarded_${userId}`) === '1'
}

export default function Onboarding() {
  const { user } = useAuth()
  const { refresh } = useApp()
  const navigate = useNavigate()

  // Nothing selected by default — user makes deliberate choices
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [importing, setImporting] = useState(false)

  function toggle(i: number) {
    setSelected(s => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(STARTER_CARDS.map((_, i) => i)))
  }

  function clearAll() {
    setSelected(new Set())
  }

  async function handleGetStarted() {
    if (!user) return
    setImporting(true)

    const toImport = STARTER_CARDS.filter((_, i) => selected.has(i))
    for (const starter of toImport) {
      const { data, error } = await supabase
        .from('credit_cards')
        .insert({
          name: starter.name,
          bank: starter.bank,
          card_network: starter.card_network,
          base_mpd: starter.base_mpd,
          color: starter.color,
          active: true,
          user_id: user.id,
        })
        .select('id')
        .single()

      if (error || !data) continue

      if (starter.rates.length > 0) {
        await supabase.from('card_rates').insert(
          starter.rates.map(r => ({
            card_id: data.id, category_id: r.category_id, mpd: r.mpd,
            effective_from: '2000-01-01',
          }))
        )
      }
      if (starter.caps.length > 0) {
        await supabase.from('spending_caps').insert(
          starter.caps.map(c => ({
            card_id: data.id,
            category_id: c.category_id || null,
            cap_period: c.cap_period,
            spend_limit: c.spend_limit,
            effective_from: '2000-01-01',
          }))
        )
      }
    }

    markOnboarded(user.id)
    await refresh()
    setImporting(false)
    navigate('/')
  }

  function skip() {
    if (user) markOnboarded(user.id)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900">MilesMaximiser</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Which cards are in your wallet?</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Select the cards you currently own. You can add or remove cards at any time from <strong>My Cards</strong>.
          </p>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {STARTER_CARDS.map((card, i) => {
            const isSelected = selected.has(i)
            return (
              <button
                key={i}
                onClick={() => toggle(i)}
                className={`relative rounded-xl p-4 text-left border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-white shadow-md ring-2 ring-indigo-200'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                {/* Checkmark */}
                <div
                  className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'border-gray-300 bg-white'
                  }`}
                >
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
                <p className="text-xs text-gray-400 leading-tight mt-0.5 line-clamp-2">{card.name}</p>

                {/* Top bonus rates */}
                <div className="mt-2.5 space-y-0.5">
                  {card.rates.slice(0, 2).map((r, j) => (
                    <p key={j} className="text-xs text-indigo-600 font-medium">
                      {r.mpd} mpd · {r.label}
                    </p>
                  ))}
                  <p className="text-xs text-gray-400">{card.base_mpd} mpd base</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex gap-2">
            <button onClick={selectAll} className="btn-secondary text-sm py-1.5">
              Select all
            </button>
            <button onClick={clearAll} className="btn-secondary text-sm py-1.5">
              Clear
            </button>
          </div>

          <div className="sm:ml-auto flex items-center gap-4">
            <button
              onClick={skip}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={handleGetStarted}
              disabled={importing}
              className="btn-primary"
            >
              {importing ? (
                <><Loader2 size={15} className="animate-spin" /> Setting up…</>
              ) : selected.size === 0 ? (
                'Continue without cards →'
              ) : (
                `Add ${selected.size} card${selected.size !== 1 ? 's' : ''} & Get Started →`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
