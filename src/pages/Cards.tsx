import { useMemo, useState } from 'react'
import { Check, Plus, Minus, Info, Pencil, CalendarDays } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { resolveRates, resolveCaps, resolveOverride, applySelectableOverride } from '../lib/recommendations'
import { capPeriodLabel, isoDate } from '../lib/utils'
import { CreditCard, SpendingCap } from '../lib/types'
import Modal from '../components/Modal'

export default function Cards() {
  const {
    allCards, selectedCardIds, categories, rates, caps,
    selectableCategories, overrides, statementDays,
    addCardSelection, removeCardSelection, saveOverride, saveStatementDay,
  } = useApp()

  // Inline statement-day editing state — keyed by card id
  const [editingStatementDay, setEditingStatementDay] = useState<string | null>(null)
  const [statementDayInput, setStatementDayInput] = useState('')
  const [savingStatementDay, setSavingStatementDay] = useState(false)

  function openStatementDayEdit(cardId: string) {
    setEditingStatementDay(cardId)
    setStatementDayInput(String(statementDays.get(cardId) ?? ''))
  }

  async function handleSaveStatementDay(cardId: string) {
    const parsed = parseInt(statementDayInput, 10)
    const day = isNaN(parsed) || statementDayInput === '' ? null : Math.min(28, Math.max(1, parsed))
    setSavingStatementDay(true)
    await saveStatementDay(cardId, day)
    setSavingStatementDay(false)
    setEditingStatementDay(null)
  }

  const today = useMemo(() => new Date(), [])

  // State for the bonus-category edit modal
  const [editCard, setEditCard] = useState<CreditCard | null>(null)
  const [editChoices, setEditChoices] = useState<string[]>([])
  const [editDate, setEditDate] = useState(isoDate())
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  function openEditModal(card: CreditCard) {
    const current = resolveOverride(overrides, card.id, today) ?? []
    setEditCard(card)
    setEditChoices(current)
    setEditDate(isoDate())
    setEditError(null)
    setEditSaving(false)
  }

  async function handleSaveOverride() {
    if (!editCard || editChoices.length === 0) {
      setEditError('Please select at least one category.')
      return
    }
    if (editChoices.length > editCard.max_selectable) {
      setEditError(`This card allows up to ${editCard.max_selectable} categories.`)
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      await saveOverride(editCard.id, editChoices, editDate)
      setEditCard(null)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Failed to save.')
    }
    setEditSaving(false)
  }

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

  // Build selectable category map: card_id → category_id[]
  const selectableMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const sc of selectableCategories) {
      const list = map.get(sc.card_id) ?? []
      list.push(sc.category_id)
      map.set(sc.card_id, list)
    }
    return map
  }, [selectableCategories])

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

              // For selectable cards in the wallet, show the override category instead of the library default
              const activeOverrideCatIds = card.selectable_category
                ? (resolveOverride(overrides, card.id, today) ?? null)
                : null

              // Apply selectable override so Solitaire (2 chosen categories) shows 2 cap chips
              const displayedCaps: SpendingCap[] =
                card.selectable_category && activeOverrideCatIds?.length
                  ? applySelectableOverride(cardRates, cardCaps, card.id, activeOverrideCatIds).caps
                  : cardCaps

              // Group caps: combined-cap cards collapse into one chip per group
              const capGroupMap = new Map<string, SpendingCap[]>()
              for (const cap of displayedCaps) {
                const key = cap.cap_group ? `group:${cap.cap_group}` : `single:${cap.id}`
                const list = capGroupMap.get(key) ?? []
                list.push(cap)
                capGroupMap.set(key, list)
              }

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
                        {card.mile_validity && (
                          <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Miles: {card.mile_validity}
                          </span>
                        )}
                        {card.cap_cycle === 'calendar' ? (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Calendar Cycle
                          </span>
                        ) : (
                          <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            Statement Cycle
                          </span>
                        )}
                        {inWallet && (
                          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check size={10} /> In Wallet
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-500 mt-0.5">Base rate: {card.base_mpd} mpd</p>

                      {/* Bonus rates */}
                      {card.selectable_category ? (
                        // Selectable card: show active override or a prompt
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {activeOverrideCatIds && activeOverrideCatIds.length > 0 ? (
                            activeOverrideCatIds.map(catId => {
                              const cat = categories.find(c => c.id === catId)
                              const templateRate = cardRates[0]
                              return cat ? (
                                <span key={catId} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
                                  {cat.icon} {cat.name}: {templateRate?.mpd ?? '—'} mpd
                                  <span className="text-indigo-400 ml-1 text-[10px]">your choice</span>
                                </span>
                              ) : null
                            })
                          ) : (
                            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
                              ⚠️ Bonus category not set — using library default (Dining)
                            </span>
                          )}
                          {/* Edit button shown only for wallet cards */}
                          {inWallet && (
                            <button
                              onClick={() => openEditModal(card)}
                              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 px-2 py-1 rounded-lg transition-colors"
                            >
                              <Pencil size={10} /> Change
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Regular card: show library rates */
                        cardRates.length > 0 && (
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
                        )
                      )}

                      {/* Caps */}
                      {capGroupMap.size > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Array.from(capGroupMap.values()).map(groupCaps => {
                            const firstCap = groupCaps[0]
                            if (firstCap.cap_group !== null) {
                              // Combined cap — show one chip listing all category names
                              const catNames = groupCaps
                                .map(c => categories.find(cat => cat.id === c.category_id)?.name ?? '')
                                .filter(Boolean).join(', ')
                              return (
                                <span
                                  key={`${firstCap.card_id}:${firstCap.cap_group}`}
                                  className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg"
                                >
                                  Combined cap: S${firstCap.spend_limit?.toLocaleString()}/{capPeriodLabel(firstCap.cap_period).toLowerCase()}
                                  {catNames && ` (${catNames})`}
                                </span>
                              )
                            }
                            // Individual cap (includes Solitaire's per-chosen-category caps)
                            const capCat = firstCap.category_id ? categories.find(c => c.id === firstCap.category_id) : null
                            return (
                              <span key={firstCap.id} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
                                Cap: S${firstCap.spend_limit?.toLocaleString()}/{capPeriodLabel(firstCap.cap_period).toLowerCase()}
                                {capCat ? ` (${capCat.name})` : ' (all)'}
                                {!card.selectable_category && (
                                  <span className="text-amber-400 ml-1 text-[10px]">since {firstCap.effective_from}</span>
                                )}
                              </span>
                            )
                          })}
                        </div>
                      )}

                      {/* Remarks */}
                      {card.remarks && card.remarks.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {card.remarks.map((r, i) => (
                            <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                              <span className="text-gray-300 shrink-0 mt-px">•</span>
                              {r}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Statement date — only for wallet cards on statement cycle */}
                      {inWallet && card.cap_cycle === 'statement' && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          {editingStatementDay === card.id ? (
                            <div className="flex items-center gap-2">
                              <CalendarDays size={13} className="text-gray-400 shrink-0" />
                              <span className="text-xs text-gray-500">Statement closes day</span>
                              <input
                                type="number"
                                min={1}
                                max={28}
                                placeholder="e.g. 15"
                                value={statementDayInput}
                                onChange={e => setStatementDayInput(e.target.value)}
                                className="input text-xs w-16 py-1 px-2"
                              />
                              <span className="text-xs text-gray-400">of each month</span>
                              <button
                                onClick={() => handleSaveStatementDay(card.id)}
                                disabled={savingStatementDay}
                                className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded-lg transition-colors"
                              >
                                {savingStatementDay ? '…' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingStatementDay(null)}
                                className="text-xs text-gray-400 hover:text-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CalendarDays size={13} className="text-gray-400 shrink-0" />
                              <span className="text-xs text-gray-500">
                                {statementDays.has(card.id)
                                  ? `Statement closes day ${statementDays.get(card.id)} of each month`
                                  : 'Statement date not set — using calendar month'}
                              </span>
                              <button
                                onClick={() => openStatementDayEdit(card.id)}
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 px-2 py-0.5 rounded-lg transition-colors"
                              >
                                <Pencil size={9} /> {statementDays.has(card.id) ? 'Change' : 'Set'}
                              </button>
                            </div>
                          )}
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

      {/* Bonus category edit modal */}
      {editCard && (
        <Modal title="Set Bonus Category" onClose={() => setEditCard(null)}>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700">{editCard.bank} {editCard.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {editCard.max_selectable === 1
                  ? 'Select the one category your card earns its bonus MPD on.'
                  : `Select up to ${editCard.max_selectable} categories your card earns its bonus MPD on.`}{' '}
                This should match the choice you made at card application. You can update it at
                any time — past transactions are not affected.
              </p>
            </div>

            {/* Category selector — radio for single-choice, checkbox for multi-choice */}
            <div className="space-y-2">
              {(selectableMap.get(editCard.id) ?? []).map(catId => {
                const cat = categories.find(c => c.id === catId)
                if (!cat) return null
                const selected = editChoices.includes(catId)
                const isMulti = editCard.max_selectable > 1

                function toggleChoice() {
                  if (!isMulti) {
                    setEditChoices([catId])
                  } else if (selected) {
                    setEditChoices(prev => prev.filter(id => id !== catId))
                  } else if (editChoices.length < editCard!.max_selectable) {
                    setEditChoices(prev => [...prev, catId])
                  }
                }

                return (
                  <label
                    key={catId}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      selected
                        ? 'border-indigo-400 bg-indigo-50'
                        : editChoices.length >= editCard.max_selectable && !selected
                          ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type={isMulti ? 'checkbox' : 'radio'}
                      name="bonus-category"
                      value={catId}
                      checked={selected}
                      onChange={toggleChoice}
                      disabled={!selected && editChoices.length >= editCard.max_selectable}
                      className="accent-indigo-600"
                    />
                    <span className="text-lg leading-none">{cat.icon}</span>
                    <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                  </label>
                )
              })}
            </div>

            {editCard.max_selectable > 1 && (
              <p className="text-xs text-gray-400">
                {editChoices.length} of {editCard.max_selectable} selected
              </p>
            )}

            {/* Effective date */}
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                <CalendarDays size={12} /> Effective from
              </label>
              <input
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="input text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Transactions before this date keep their original bonus category for accurate history.
              </p>
            </div>

            {editError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditCard(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleSaveOverride} disabled={editSaving} className="btn-primary flex-1">
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
