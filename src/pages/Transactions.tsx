import { useState, useMemo } from 'react'
import { Plus, Trash2, ChevronDown, Sparkles, Pencil, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import VendorInput from '../components/VendorInput'
import { supabase } from '../lib/supabase'
import { recommendCards, calcMiles } from '../lib/recommendations'
import { isoDate } from '../lib/utils'
import { TransactionFormData, CardRecommendation, Transaction, Vendor } from '../lib/types'

const EMPTY_FORM: TransactionFormData = {
  card_id: '',
  category_id: '',
  amount: '',
  description: '',
  transaction_date: isoDate(),
}

export default function Transactions() {
  const { cards, categories, rates, caps, transactions, overrides, statementDays, mccCatalogue, vendorCatalogue, refreshTransactions } = useApp()
  const { user } = useAuth()

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TransactionFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Vendor / MCC state
  const [vendorName, setVendorName] = useState('')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [mcc, setMcc] = useState('')
  const [mccEditing, setMccEditing] = useState(false)

  const [paymentChannel, setPaymentChannel] = useState<'contactless' | 'online' | 'chip' | null>(null)

  // MPD override state
  const [mpdOverrideActive, setMpdOverrideActive] = useState(false)
  const [manualMpd, setManualMpd] = useState('')
  const [overrideNote, setOverrideNote] = useState('')

  // Filters
  const [filterMonth, setFilterMonth] = useState(isoDate().slice(0, 7))
  const [filterCat, setFilterCat] = useState('')
  const [filterCard, setFilterCard] = useState('')

  // Engine-computed MPD for the current form selection
  const computedMpd = useMemo(() => {
    const amt = parseFloat(form.amount)
    if (!form.card_id || !form.category_id || isNaN(amt) || amt <= 0) return null
    const card = cards.find(c => c.id === form.card_id)
    if (!card) return null
    const txDate = form.transaction_date ? new Date(form.transaction_date) : new Date()
    return calcMiles(card, rates, caps, form.category_id, amt, transactions, txDate, overrides, paymentChannel, statementDays).effectiveMpd
  }, [form.card_id, form.category_id, form.amount, form.transaction_date, cards, rates, caps, transactions, overrides, paymentChannel])

  // Live recommendations while filling form
  const recs = useMemo<CardRecommendation[]>(() => {
    const amt = parseFloat(form.amount)
    if (!form.category_id || isNaN(amt) || amt <= 0) return []
    const txDate = form.transaction_date ? new Date(form.transaction_date) : new Date()
    return recommendCards(cards, rates, caps, form.category_id, amt, transactions, txDate, overrides, paymentChannel)
  }, [form.category_id, form.amount, form.transaction_date, cards, rates, caps, transactions, overrides, paymentChannel])

  const bestCardId = recs[0]?.card.id ?? ''

  function setField(k: keyof TransactionFormData, v: string) {
    if (k === 'card_id' || k === 'category_id') {
      setMpdOverrideActive(false)
      setManualMpd('')
      setOverrideNote('')
    }
    if (k === 'card_id') {
      // Auto-set payment channel from the card's default when card changes
      const newCard = cards.find(c => c.id === v)
      setPaymentChannel(newCard?.default_payment_channel ?? null)
    }
    setForm(f => ({ ...f, [k]: v }))
  }

  function resetModal() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setVendorName('')
    setSelectedVendor(null)
    setMcc('')
    setMccEditing(false)
    setPaymentChannel(null)
    setMpdOverrideActive(false)
    setManualMpd('')
    setOverrideNote('')
    setError(null)
  }

  function openAdd() {
    resetModal()
    setShowModal(true)
  }

  function openEdit(t: Transaction) {
    setForm({
      card_id: t.card_id ?? '',
      category_id: t.category_id ?? '',
      amount: t.amount.toString(),
      description: t.description ?? '',
      transaction_date: t.transaction_date,
    })
    setVendorName(t.vendor_name ?? '')
    setSelectedVendor(null)  // don't re-match — treat as free text on edit
    setMcc(t.mcc ?? '')
    setPaymentChannel(t.payment_channel ?? null)
    setMccEditing(false)
    if (t.manual_mpd != null) {
      setMpdOverrideActive(true)
      setManualMpd(t.manual_mpd.toString())
      setOverrideNote(t.override_note ?? '')
    } else {
      setMpdOverrideActive(false)
      setManualMpd('')
      setOverrideNote('')
    }
    setEditingId(t.id)
    setError(null)
    setShowModal(true)
  }

  function handleVendorSelect(vendor: Vendor) {
    setVendorName(vendor.name)
    setSelectedVendor(vendor)
    if (vendor.default_category_id) setField('category_id', vendor.default_category_id)
    if (vendor.default_mcc) setMcc(vendor.default_mcc)
    else setMcc('')
  }

  function handleVendorClear() {
    setVendorName('')
    setSelectedVendor(null)
    setMcc('')
  }

  function activateOverride() {
    setMpdOverrideActive(true)
    setManualMpd(computedMpd != null ? computedMpd.toFixed(2) : '')
  }

  function resetOverride() {
    setMpdOverrideActive(false)
    setManualMpd('')
    setOverrideNote('')
  }

  async function handleSave() {
    const amount = parseFloat(form.amount)
    if (!form.card_id || !form.category_id || isNaN(amount) || amount <= 0) {
      setError('Card, category, and a valid amount are required.')
      return
    }
    setSaving(true)
    setError(null)

    const card = cards.find(c => c.id === form.card_id)!
    const txDate = form.transaction_date ? new Date(form.transaction_date) : new Date()
    const { effectiveMpd: engineMpd } = calcMiles(card, rates, caps, form.category_id, amount, transactions, txDate, overrides, paymentChannel, statementDays)

    const parsedManual = parseFloat(manualMpd)
    const hasValidOverride = mpdOverrideActive && !isNaN(parsedManual) && parsedManual > 0
    const finalMpd = hasValidOverride ? parsedManual : engineMpd

    const payload = {
      card_id: form.card_id,
      category_id: form.category_id,
      amount,
      description: form.description || null,
      vendor_name: vendorName.trim() || null,
      mcc: mcc.trim() || null,
      payment_channel: paymentChannel,
      transaction_date: form.transaction_date,
      computed_mpd: parseFloat(engineMpd.toFixed(4)),
      manual_mpd: hasValidOverride ? parseFloat(parsedManual.toFixed(4)) : null,
      override_note: hasValidOverride && overrideNote.trim() ? overrideNote.trim() : null,
      effective_mpd: parseFloat(finalMpd.toFixed(4)),
      miles_earned: Math.round(amount * finalMpd),
    }

    let dbErr
    if (editingId) {
      ;({ error: dbErr } = await supabase.from('transactions').update(payload).eq('id', editingId))
    } else {
      ;({ error: dbErr } = await supabase.from('transactions').insert({ ...payload, user_id: user!.id }))
    }

    setSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    setShowModal(false)
    refreshTransactions()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    await supabase.from('transactions').delete().eq('id', id)
    refreshTransactions()
  }

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterMonth && !t.transaction_date.startsWith(filterMonth)) return false
      if (filterCat && t.category_id !== filterCat) return false
      if (filterCard && t.card_id !== filterCard) return false
      return true
    })
  }, [transactions, filterMonth, filterCat, filterCard])

  const totalMiles = filtered.reduce((s, t) => s + (t.miles_earned ?? 0), 0)
  const totalSpent = filtered.reduce((s, t) => s + t.amount, 0)

  const months = useMemo(() => {
    const set = new Set(transactions.map(t => t.transaction_date.slice(0, 7)))
    set.add(isoDate().slice(0, 7))
    return Array.from(set).sort().reverse()
  }, [transactions])

  // Live miles preview in modal
  const parsedManualMpd = parseFloat(manualMpd)
  const previewMpd = mpdOverrideActive && !isNaN(parsedManualMpd) && parsedManualMpd > 0
    ? parsedManualMpd
    : computedMpd
  const previewMiles = previewMpd != null && parseFloat(form.amount) > 0
    ? Math.round(parseFloat(form.amount) * previewMpd)
    : null

  // MCC display helper
  const mccDescription = mcc ? mccCatalogue.find(m => m.code === mcc)?.description : undefined

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Log Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative">
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="input w-36 appearance-none pr-7 text-sm"
          >
            {months.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="input w-40 appearance-none pr-7 text-sm"
          >
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={filterCard}
            onChange={e => setFilterCard(e.target.value)}
            className="input w-48 appearance-none pr-7 text-sm"
          >
            <option value="">All cards</option>
            {cards.map(c => (
              <option key={c.id} value={c.id}>{c.bank} {c.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="ml-auto flex gap-4 items-center text-sm text-gray-500">
          <span>S${totalSpent.toFixed(2)} spent</span>
          <span className="text-indigo-600 font-medium">+{Math.round(totalMiles).toLocaleString()} miles</span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No transactions found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Vendor / Description</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Card</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-right px-4 py-3 hidden sm:table-cell">Miles</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">MPD</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(t => {
                const card = cards.find(c => c.id === t.card_id)
                const cat = categories.find(c => c.id === t.category_id)
                const isManual = t.manual_mpd != null
                const displayLabel = t.vendor_name || t.description || cat?.name || '—'
                return (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{t.transaction_date}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-[180px]">
                      <span className="block truncate">{displayLabel}</span>
                      {t.mcc && (
                        <span className="text-xs text-gray-400 font-mono">
                          {t.mcc}
                          {mccCatalogue.find(m => m.code === t.mcc) && (
                            <span className="ml-1 not-italic font-sans">
                              · {mccCatalogue.find(m => m.code === t.mcc)!.description}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-500">
                      {cat ? `${cat.icon} ${cat.name}` : '—'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {card ? (
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: card.color }}
                          />
                          <span className="text-gray-700">{card.bank} {card.name}</span>
                          {t.payment_channel === 'contactless' && (
                            <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1 rounded">tap</span>
                          )}
                          {t.payment_channel === 'online' && (
                            <span className="text-[10px] text-sky-500 bg-sky-50 px-1 rounded">online</span>
                          )}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      S${t.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      {t.miles_earned != null
                        ? <span className="text-indigo-600 font-medium">+{Math.round(t.miles_earned).toLocaleString()}</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell text-gray-400 text-xs">
                      {t.effective_mpd != null ? (
                        <span className="inline-flex items-center justify-end gap-1">
                          {isManual && (
                            <span
                              title={
                                t.override_note
                                  ? `Manual · ${t.override_note} (computed: ${t.computed_mpd} mpd)`
                                  : `Manual override (computed: ${t.computed_mpd} mpd)`
                              }
                            >
                              <Pencil size={10} className="text-amber-400" />
                            </span>
                          )}
                          {t.effective_mpd} mpd
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="text-gray-300 hover:text-indigo-500 transition-colors p-1 rounded"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit modal */}
      {showModal && (
        <Modal
          title={editingId ? 'Edit Transaction' : 'Log Transaction'}
          onClose={() => setShowModal(false)}
        >
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.transaction_date}
              onChange={e => setField('transaction_date', e.target.value)} />
          </div>

          {/* Vendor typeahead */}
          <div>
            <label className="label">Vendor</label>
            <VendorInput
              vendorName={vendorName}
              isVendorSelected={selectedVendor !== null}
              vendors={vendorCatalogue}
              onNameChange={name => {
                setVendorName(name)
                setSelectedVendor(null)
              }}
              onSelect={handleVendorSelect}
              onClear={handleVendorClear}
            />
          </div>

          {/* Category — auto-filled by vendor selection */}
          <div>
            <label className="label">Category</label>
            <div className="relative">
              <select
                value={form.category_id}
                onChange={e => setField('category_id', e.target.value)}
                className="input appearance-none pr-8"
              >
                <option value="">Select category…</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* MCC — auto-filled by vendor selection, always optional */}
          <div>
            <label className="label">
              MCC{' '}
              <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            {mccEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={mcc}
                  onChange={e => setMcc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onBlur={() => setMccEditing(false)}
                  placeholder="e.g. 5814"
                  maxLength={4}
                  className="input w-24 font-mono text-sm"
                  autoFocus
                />
                {mcc.length === 4 && mccDescription ? (
                  <span className="text-sm text-gray-600">{mccDescription}</span>
                ) : mcc.length > 0 ? (
                  <span className="text-xs text-gray-400 italic">Unknown MCC</span>
                ) : null}
              </div>
            ) : mcc ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  {mcc}
                </span>
                <span className="text-sm text-gray-600 flex-1">
                  {mccDescription ?? 'Unknown MCC'}
                </span>
                <button
                  type="button"
                  onClick={() => setMccEditing(true)}
                  className="text-gray-400 hover:text-indigo-600 transition-colors"
                  title="Edit MCC"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setMcc('')}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove MCC"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setMccEditing(true)}
                className="text-xs text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1"
              >
                + Add MCC
              </button>
            )}
          </div>

          <div>
            <label className="label">Amount (S$)</label>
            <input type="number" min="0" step="0.01" placeholder="0.00" className="input"
              value={form.amount} onChange={e => setField('amount', e.target.value)} />
          </div>

          {/* Live recommendation — only shown when adding */}
          {!editingId && recs.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                <Sparkles size={12} /> Recommendation
              </p>
              {recs.slice(0, 3).map((rec, i) => (
                <button
                  key={rec.card.id}
                  type="button"
                  onClick={() => setField('card_id', rec.card.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    form.card_id === rec.card.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white hover:bg-indigo-100 text-gray-700'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: rec.card.color }}
                  />
                  <span className="flex-1 truncate">
                    {i === 0 && '⭐ '}{rec.card.bank} {rec.card.name}
                  </span>
                  <StatusBadge status={rec.status} />
                  <span className="font-semibold whitespace-nowrap">
                    {rec.effectiveMpd.toFixed(2)} mpd
                  </span>
                </button>
              ))}
              {form.card_id === '' && bestCardId && (
                <p className="text-xs text-indigo-500 pl-1">
                  Tap a card above to select it, or choose below.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="label">Card Used</label>
            <div className="relative">
              <select
                value={form.card_id}
                onChange={e => setField('card_id', e.target.value)}
                className="input appearance-none pr-8"
              >
                <option value="">Select card…</option>
                {cards.map(c => (
                  <option key={c.id} value={c.id}>{c.bank} {c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Payment method — auto-filled from card default; affects cap tracking */}
          <div>
            <label className="label">
              Payment Method
              <span className="text-gray-400 font-normal text-xs ml-1">(affects cap tracking)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['chip', 'contactless', 'online'] as const).map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentChannel(paymentChannel === mode ? null : mode)}
                  className={`py-1.5 text-xs rounded-lg border transition-colors ${
                    paymentChannel === mode
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {mode === 'chip' ? 'Chip / Swipe' : mode === 'contactless' ? 'Tap to pay' : 'Online'}
                </button>
              ))}
            </div>
          </div>

          {/* MPD section — appears once card + category + amount are set */}
          {computedMpd !== null && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium text-gray-700">Miles Rate</span>
                {!mpdOverrideActive ? (
                  <button
                    type="button"
                    onClick={activateOverride}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    <Pencil size={10} /> Override
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={resetOverride}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    ↺ Reset to computed ({computedMpd.toFixed(2)} mpd)
                  </button>
                )}
              </div>

              {!mpdOverrideActive ? (
                <div className="input bg-gray-50 flex items-center justify-between text-gray-600 cursor-default select-none">
                  <span>{computedMpd.toFixed(2)} mpd</span>
                  <span className="text-xs text-gray-400">computed</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder={computedMpd.toFixed(2)}
                      value={manualMpd}
                      onChange={e => setManualMpd(e.target.value)}
                      className="input flex-1"
                      autoFocus
                    />
                    <span className="text-sm text-gray-500 shrink-0">mpd</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Reason (e.g. 5× Grab weekend promo)"
                    value={overrideNote}
                    onChange={e => setOverrideNote(e.target.value)}
                    className="input text-sm"
                  />
                </div>
              )}

              {previewMiles != null && (
                <p className="text-xs text-gray-400 mt-1.5 text-right">
                  Miles earned:{' '}
                  <span className="text-indigo-600 font-medium">{previewMiles.toLocaleString()} mi</span>
                </p>
              )}
            </div>
          )}

          <div>
            <label className="label">Notes <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
            <input type="text" placeholder="Additional notes…" className="input"
              value={form.description} onChange={e => setField('description', e.target.value)} />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save Transaction'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
