import { useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from './Modal'

export default function StatementDayPrompt() {
  const { cards, allCards, statementDays, saveStatementDay, loading } = useApp()
  const [dismissed, setDismissed] = useState(false)
  const [dayInput, setDayInput]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // Show prompt for any statement-cycle card in the wallet with no day set
  const dataReady = !loading && allCards.length > 0
  const pendingCards = dataReady
    ? cards.filter(c => c.cap_cycle === 'statement' && !statementDays.has(c.id))
    : []

  if (!dataReady || dismissed || pendingCards.length === 0) return null

  const card = pendingCards[0]
  const day = parseInt(dayInput, 10)
  const valid = !isNaN(day) && day >= 1 && day <= 28

  async function handleSave() {
    if (!valid) { setError('Please enter a day between 1 and 28.'); return }
    setSaving(true)
    await saveStatementDay(card.id, day)
    setSaving(false)
    setDayInput('')
  }

  function handleDismiss() {
    setDismissed(true)
  }

  return (
    <Modal
      title=""
      onClose={handleDismiss}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
            <CalendarDays size={18} className="text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-base">
              Set billing cycle for {card.bank} {card.name}
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              This card's bonus cap resets on a statement cycle, not the 1st of each month.
              Tell SmileMax which day your new billing period <span className="font-medium text-gray-600">starts</span> so it can track your caps accurately.
            </p>
          </div>
        </div>

        {/* Input */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Billing cycle starts on day… (1–28)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={28}
              placeholder="e.g. 23"
              value={dayInput}
              onChange={e => { setDayInput(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="input w-28"
              autoFocus
            />
            <span className="text-sm text-gray-500">of each month</span>
          </div>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          <p className="text-xs text-gray-500 mt-2">
            You can also update this anytime from the <span className="font-medium text-gray-500">My Cards</span> page.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving || !dayInput}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={handleDismiss}
            className="btn-secondary"
          >
            Remind me later
          </button>
        </div>

        {pendingCards.length > 1 && (
          <p className="text-xs text-gray-500">
            {pendingCards.length - 1} more card{pendingCards.length > 2 ? 's' : ''} also need{pendingCards.length === 2 ? 's' : ''} a statement date.
          </p>
        )}
      </div>
    </Modal>
  )
}
