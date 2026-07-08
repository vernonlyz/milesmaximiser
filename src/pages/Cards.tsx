import { useMemo, useState } from 'react'
import { Check, Plus, Minus, Info, Pencil, CalendarDays } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { resolveRates, resolveCaps, resolveOverride, applySelectableOverride } from '../lib/recommendations'
import { capPeriodLabel, isoDate } from '../lib/utils'
import { CreditCard, SpendingCap } from '../lib/types'
import Modal from '../components/Modal'
import DatePicker from '../components/DatePicker'

export default function Cards() {
  const {
    allCards, cards: walletCards, selectedCardIds, categories, rates, caps,
    selectableCategories, overrides, statementDays,
    addCardSelection, removeCardSelection, saveOverride, saveStatementDay, setRateBoost,
  } = useApp()

  // Inline statement-day editing state — keyed by card id
  const [editingStatementDay, setEditingStatementDay] = useState<string | null>(null)
  const [statementDayInput, setStatementDayInput] = useState('')
  const [savingStatementDay, setSavingStatementDay] = useState(false)

  // Statement-day prompt when adding a statement-cycle card
  const [pendingAddCard, setPendingAddCard] = useState<CreditCard | null>(null)
  const [pendingRemoveCard, setPendingRemoveCard] = useState<CreditCard | null>(null)
  const [detailsCard, setDetailsCard] = useState<CreditCard | null>(null)
  const [boostDate, setBoostDate] = useState<string>(new Date().toLocaleDateString('en-CA'))
  const [pendingDay, setPendingDay] = useState('')
  const [addingSaving, setAddingSaving] = useState(false)

  function handleAddClick(card: CreditCard) {
    if (card.cap_cycle === 'statement') {
      setPendingAddCard(card)
      setPendingDay('')
    } else {
      addCardSelection(card.id)
    }
  }

  async function confirmPendingAdd(skipDay: boolean) {
    if (!pendingAddCard) return
    setAddingSaving(true)
    await addCardSelection(pendingAddCard.id)
    if (!skipDay) {
      const parsed = parseInt(pendingDay, 10)
      const day = isNaN(parsed) ? null : Math.min(28, Math.max(1, parsed))
      if (day) await saveStatementDay(pendingAddCard.id, day)
    }
    setAddingSaving(false)
    setPendingAddCard(null)
    setPendingDay('')
  }

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
    const cardOverrides = overrides.filter(o => o.card_id === card.id)
    // Treat as first-time if no overrides exist, or all existing overrides are from today
    // (i.e. the user just set it up today and it doesn't cover past transactions yet).
    const todayStr = isoDate()
    const isFirstSetup = cardOverrides.length === 0 || cardOverrides.every(o => o.effective_from >= todayStr)
    setEditCard(card)
    setEditChoices(current)
    // First-time setup: apply to all transactions (past and future).
    // Changing an existing override: default to today to preserve category history.
    setEditDate(isFirstSetup ? '2000-01-01' : isoDate())
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

  const [walletFilter, setWalletFilter] = useState<'all' | 'wallet'>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'miles' | 'cashback'>('all')
  const [bankFilter, setBankFilter] = useState<string>('all')

  const libraryCards = useMemo(
    () => allCards.filter(c => c.active && c.card_type !== 'debit'),
    [allCards]
  )

  const banks = useMemo(
    () => Array.from(new Set(libraryCards.map(c => c.bank))).sort(),
    [libraryCards]
  )

  const filteredLibrary = useMemo(() => {
    return libraryCards.filter(c => {
      if (walletFilter === 'wallet' && !selectedCardIds.has(c.id)) return false
      if (typeFilter !== 'all' && c.card_type !== typeFilter) return false
      if (bankFilter !== 'all' && c.bank !== bankFilter) return false
      return true
    })
  }, [libraryCards, walletFilter, typeFilter, bankFilter, selectedCardIds])

  // One continuous list, sorted by bank then card name (no per-bank sub-grids).
  const sortedCards = useMemo(
    () => [...filteredLibrary].sort((a, b) => a.bank.localeCompare(b.bank) || a.name.localeCompare(b.name)),
    [filteredLibrary]
  )

  // Per-card display data, shared by the tile and the details modal.
  function cardData(card: CreditCard) {
    const cardRates = resolveRates(rates.filter(r => r.card_id === card.id), today)
    const cardCaps = resolveCaps(caps.filter(c => c.card_id === card.id), today)
    const inWallet = selectedCardIds.has(card.id)
    const activeOverrideCatIds = card.selectable_category
      ? (resolveOverride(overrides, card.id, today) ?? null)
      : null
    const displayedCaps: SpendingCap[] =
      card.selectable_category && activeOverrideCatIds?.length
        ? applySelectableOverride(cardRates, cardCaps, card.id, activeOverrideCatIds).caps
        : cardCaps
    const capGroupMap = new Map<string, SpendingCap[]>()
    for (const cap of displayedCaps) {
      const key = cap.cap_group ? `group:${cap.cap_group}` : `single:${cap.id}`
      const list = capGroupMap.get(key) ?? []
      list.push(cap)
      capGroupMap.set(key, list)
    }
    return { cardRates, inWallet, activeOverrideCatIds, capGroupMap }
  }

  // Short one-line headline for a tile (top bonus rate / cashback / prompt).
  function headline(card: CreditCard, cardRates: ReturnType<typeof cardData>['cardRates']): string {
    if (card.card_type === 'cashback') {
      return card.cashback_rate != null ? `${(card.cashback_rate * 100).toFixed(1)}% cashback` : 'Cashback'
    }
    if (card.selectable_category) {
      return cardRates[0]?.mpd ? `${cardRates[0].mpd} mpd · your category` : 'Pick a bonus category'
    }
    if (cardRates.length === 0) return `${card.base_mpd} mpd base`
    const top = cardRates.reduce((a, b) => (b.mpd > a.mpd ? b : a))
    const cat = categories.find(c => c.id === top.category_id)
    return `${top.mpd} mpd${cat ? ` ${cat.name}` : ''}`
  }

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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Cards</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {walletCount} card{walletCount !== 1 ? 's' : ''} in your wallet
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700">
          Rates and caps are maintained centrally and kept up to date.
          Toggle cards below to add or remove them from your wallet.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'wallet'] as const).map(w => (
          <button
            key={w}
            onClick={() => setWalletFilter(w)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              walletFilter === w
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {w === 'all' ? 'All Cards' : `In Wallet (${walletCount})`}
          </button>
        ))}
        <span className="text-gray-300 self-center">|</span>
        {(['all', 'miles', 'cashback'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              typeFilter === t
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t === 'all' ? 'All Types' : t === 'miles' ? 'Miles' : 'Cashback'}
          </button>
        ))}
        <span className="text-gray-300 self-center">|</span>
        <button
          onClick={() => setBankFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            bankFilter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Banks
        </button>
        {banks.map(b => (
          <button
            key={b}
            onClick={() => setBankFilter(b)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              bankFilter === b
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {b}
          </button>
        ))}
      </div>

      {sortedCards.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-6">No cards match the selected filters.</p>
      )}

      {/* One uniform grid of card tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
        {sortedCards.map(card => {
          const { cardRates, inWallet, activeOverrideCatIds, capGroupMap } = cardData(card)
          return (
                <div
                  key={card.id}
                  className={`card p-4 flex flex-col ${inWallet ? 'ring-2 ring-indigo-400 border-indigo-200' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: card.color }}
                    >
                      {card.bank.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{card.bank} {card.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{headline(card, cardRates)}</p>
                    </div>
                  </div>

                  {/* Meta pills */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{card.card_network}</span>
                    {card.cap_cycle === 'calendar' ? (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Calendar</span>
                    ) : (
                      <span className="text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Statement</span>
                    )}
                    {inWallet && (
                      <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check size={10} /> In Wallet
                      </span>
                    )}
                  </div>

                  {/* Actions pinned to the bottom for a uniform grid */}
                  <div className="mt-auto pt-3 flex items-center gap-2">
                    <button
                      onClick={() => setDetailsCard(card)}
                      className="flex-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
                    >
                      Details
                    </button>
                    {inWallet ? (
                      <button
                        onClick={() => setPendingRemoveCard(card)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Minus size={12} /> Remove
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAddClick(card)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                      >
                        <Plus size={12} /> Add
                      </button>
                    )}
                  </div>

                  {detailsCard?.id === card.id && (
                    <Modal title={`${card.bank} ${card.name}`} onClose={() => setDetailsCard(null)}>
                      <div>
                      <p className="text-sm text-gray-500">Base rate: {card.base_mpd} mpd</p>

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
                                  <span className="text-indigo-400 ml-1 text-[11px]">your choice</span>
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
                                  <span className="text-indigo-400 ml-1 text-[11px]">since {r.effective_from}</span>
                                </span>
                              )
                            })}
                          </div>
                        )
                      )}

                      {/* Optional rate boost (e.g. UOB Lady's Savings Account → 6 mpd) */}
                      {inWallet && card.boost_mpd != null && (
                        <div className="mt-3 space-y-1.5">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={walletCards.find(c => c.id === card.id)?.rate_boost ?? false}
                              onChange={e => setRateBoost(card.id, e.target.checked, boostDate)}
                              className="mt-0.5 accent-indigo-600"
                            />
                            <span className="text-sm text-gray-700">
                              I have a {card.boost_label}
                              <span className="block text-xs text-gray-400">
                                Boosts your chosen categories to {card.boost_mpd} mpd from the effective date.
                              </span>
                            </span>
                          </label>
                          <div className="flex items-center gap-2 pl-6">
                            <span className="text-xs text-gray-500 shrink-0">Effective from</span>
                            <DatePicker value={boostDate} onChange={setBoostDate} />
                          </div>
                        </div>
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
                                  <span className="text-amber-400 ml-1 text-[11px]">since {firstCap.effective_from}</span>
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
                              <CalendarDays size={13} className="text-gray-500 shrink-0" />
                              <span className="text-xs text-gray-500">Cycle starts day</span>
                              <input
                                type="number"
                                min={1}
                                max={28}
                                placeholder="e.g. 15"
                                value={statementDayInput}
                                onChange={e => setStatementDayInput(e.target.value)}
                                className="input text-xs w-16 py-1 px-2"
                              />
                              <span className="text-xs text-gray-500">of each month</span>
                              <button
                                onClick={() => handleSaveStatementDay(card.id)}
                                disabled={savingStatementDay}
                                className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-2 py-1 rounded-lg transition-colors"
                              >
                                {savingStatementDay ? '…' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingStatementDay(null)}
                                className="text-xs text-gray-500 hover:text-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CalendarDays size={13} className="text-gray-500 shrink-0" />
                              <span className="text-xs text-gray-500">
                                {statementDays.has(card.id)
                                  ? `Cycle starts day ${statementDays.get(card.id)} of each month`
                                  : 'Cycle start not set — using calendar month'}
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
                      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                        {inWallet ? (
                          <button
                            onClick={() => { setPendingRemoveCard(card); setDetailsCard(null) }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Minus size={13} /> Remove from wallet
                          </button>
                        ) : (
                          <button
                            onClick={() => { handleAddClick(card); setDetailsCard(null) }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            <Plus size={13} /> Add to wallet
                          </button>
                        )}
                      </div>
                    </Modal>
                  )}
                </div>
              )
            })}
      </div>

      {allCards.length === 0 && (
        <div className="card p-10 text-center border-dashed border-2 border-gray-200">
          <p className="text-gray-500 text-sm">No cards in the library yet.</p>
          <p className="text-gray-500 text-xs mt-1">Ask the admin to seed the card library.</p>
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
              <p className="text-xs text-gray-500">
                {editChoices.length} of {editCard.max_selectable} selected
              </p>
            )}

            {/* Effective date */}
            <div>
              <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5 mb-1.5">
                <CalendarDays size={12} /> Effective from
              </label>
              <DatePicker value={editDate} onChange={setEditDate} className="w-full" />
              <p className="text-xs text-gray-500 mt-1">
                {editDate === '2000-01-01'
                  ? 'Applies to all transactions (past and future) — change only if you had a different category before.'
                  : 'Transactions before this date keep their previous category choice for accurate history.'}
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

      {/* Remove-from-wallet confirmation */}
      {pendingRemoveCard && (
        <Modal title="Remove from wallet" onClose={() => setPendingRemoveCard(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Remove <span className="font-semibold text-gray-900">{pendingRemoveCard.bank} {pendingRemoveCard.name}</span> from
              your wallet? It will stop appearing in recommendations. Your logged transactions are kept.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPendingRemoveCard(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={async () => { await removeCardSelection(pendingRemoveCard.id); setPendingRemoveCard(null) }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg py-2 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Statement-day prompt when adding a statement-cycle card */}
      {pendingAddCard && (
        <Modal title={`Add ${pendingAddCard.bank} ${pendingAddCard.name}`} onClose={() => setPendingAddCard(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This card's bonus cap resets on a statement cycle, not the 1st of each month.
              Enter which day your new billing period starts to keep cap tracking accurate.
            </p>
            <div>
              <label className="label">Billing cycle starts on day</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={28}
                  placeholder="e.g. 15"
                  value={pendingDay}
                  onChange={e => setPendingDay(e.target.value)}
                  className="input w-24"
                />
                <span className="text-sm text-gray-500">of each month</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Enter the day your statement closes (1–28).</p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => confirmPendingAdd(false)}
                disabled={!pendingDay.trim() || addingSaving}
                className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {addingSaving ? 'Adding…' : 'Set & Add card'}
              </button>
              <button
                onClick={() => confirmPendingAdd(true)}
                disabled={addingSaving}
                className="text-sm text-gray-500 hover:text-gray-600 transition-colors text-center py-1"
              >
                Skip — use calendar month instead
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
