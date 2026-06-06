import { useState } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, Library, Check, Loader2 } from 'lucide-react'

import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { supabase } from '../lib/supabase'
import { CreditCard, CardFormData } from '../lib/types'
import { CARD_NETWORKS, CAP_PERIODS, PRESET_COLORS, capPeriodLabel } from '../lib/utils'
import { STARTER_CARDS } from '../lib/starterCards'

const EMPTY_FORM: CardFormData = {
  name: '', bank: '', card_network: 'Visa', base_mpd: '1.2',
  color: '#4F46E5', active: true, rates: [], caps: [],
}

export default function Cards() {
  const { cards, categories, rates, caps, refresh } = useApp()
  const { user } = useAuth()

  const [showModal, setShowModal] = useState(false)
  const [showLibrary, setShowLibrary] = useState(false)
  const [librarySelected, setLibrarySelected] = useState<Set<number>>(new Set())
  const [libraryImporting, setLibraryImporting] = useState(false)
  const [editCard, setEditCard] = useState<CreditCard | null>(null)
  const [form, setForm] = useState<CardFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cards the user already owns (matched by bank + name)
  const ownedKeys = new Set(cards.map(c => `${c.bank}|${c.name}`))

  function openLibrary() {
    setLibrarySelected(new Set())
    setShowLibrary(true)
  }

  function toggleLibraryCard(i: number) {
    setLibrarySelected(s => {
      const next = new Set(s)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function importLibraryCards() {
    if (!user || librarySelected.size === 0) return
    setLibraryImporting(true)
    const toImport = STARTER_CARDS.filter((_, i) => librarySelected.has(i))
    for (const starter of toImport) {
      const { data, error } = await supabase.from('credit_cards').insert({
        name: starter.name, bank: starter.bank, card_network: starter.card_network,
        base_mpd: starter.base_mpd, color: starter.color, active: true, user_id: user.id,
      }).select('id').single()
      if (error || !data) continue
      if (starter.rates.length > 0)
        await supabase.from('card_rates').insert(
          starter.rates.map(r => ({ card_id: data.id, category_id: r.category_id, mpd: r.mpd }))
        )
      if (starter.caps.length > 0)
        await supabase.from('spending_caps').insert(
          starter.caps.map(c => ({ card_id: data.id, category_id: c.category_id || null, cap_period: c.cap_period, spend_limit: c.spend_limit }))
        )
    }
    setLibraryImporting(false)
    setShowLibrary(false)
    refresh()
  }

  function openAdd() {
    setEditCard(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowModal(true)
  }

  function openEdit(card: CreditCard) {
    setEditCard(card)
    const cardRates = rates.filter(r => r.card_id === card.id)
    const cardCaps = caps.filter(c => c.card_id === card.id)
    setForm({
      name: card.name,
      bank: card.bank,
      card_network: card.card_network,
      base_mpd: card.base_mpd.toString(),
      color: card.color,
      active: card.active,
      rates: cardRates.map(r => ({ category_id: r.category_id, mpd: r.mpd.toString() })),
      caps: cardCaps.map(c => ({
        category_id: c.category_id ?? '',
        cap_period: c.cap_period,
        spend_limit: c.spend_limit.toString(),
      })),
    })
    setError(null)
    setShowModal(true)
  }

  async function handleDelete(card: CreditCard) {
    if (!confirm(`Delete "${card.bank} ${card.name}"? This also deletes its rates and caps.`)) return
    await supabase.from('credit_cards').delete().eq('id', card.id)
    refresh()
  }

  async function handleSave() {
    if (!form.name.trim() || !form.bank.trim()) {
      setError('Card name and bank are required.')
      return
    }
    const baseMpd = parseFloat(form.base_mpd)
    if (isNaN(baseMpd) || baseMpd <= 0) {
      setError('Base MPD must be a positive number.')
      return
    }

    setSaving(true)
    setError(null)

    if (editCard) {
      // Update card
      const { error: e1 } = await supabase.from('credit_cards').update({
        name: form.name.trim(),
        bank: form.bank.trim(),
        card_network: form.card_network,
        base_mpd: baseMpd,
        color: form.color,
        active: form.active,
      }).eq('id', editCard.id)
      if (e1) { setSaving(false); setError(e1.message); return }

      // Replace rates
      await supabase.from('card_rates').delete().eq('card_id', editCard.id)
      await supabase.from('spending_caps').delete().eq('card_id', editCard.id)
      await insertRatesAndCaps(editCard.id)
    } else {
      // Insert card
      const { data, error: e1 } = await supabase.from('credit_cards').insert({
        name: form.name.trim(),
        bank: form.bank.trim(),
        card_network: form.card_network,
        base_mpd: baseMpd,
        color: form.color,
        active: form.active,
        user_id: user!.id,
      }).select('id').single()
      if (e1 || !data) { setSaving(false); setError(e1?.message ?? 'Insert failed'); return }
      await insertRatesAndCaps(data.id)
    }

    setSaving(false)
    setShowModal(false)
    refresh()
  }

  async function insertRatesAndCaps(cardId: string) {
    const validRates = form.rates.filter(r => r.category_id && parseFloat(r.mpd) > 0)
    if (validRates.length > 0) {
      await supabase.from('card_rates').insert(
        validRates.map(r => ({ card_id: cardId, category_id: r.category_id, mpd: parseFloat(r.mpd) }))
      )
    }
    const validCaps = form.caps.filter(c => parseFloat(c.spend_limit) > 0)
    if (validCaps.length > 0) {
      await supabase.from('spending_caps').insert(
        validCaps.map(c => ({
          card_id: cardId,
          category_id: c.category_id || null,
          cap_period: c.cap_period,
          spend_limit: parseFloat(c.spend_limit),
        }))
      )
    }
  }

  function addRate() {
    setForm(f => ({ ...f, rates: [...f.rates, { category_id: '', mpd: '' }] }))
  }

  function removeRate(i: number) {
    setForm(f => ({ ...f, rates: f.rates.filter((_, j) => j !== i) }))
  }

  function setRate(i: number, k: 'category_id' | 'mpd', v: string) {
    setForm(f => ({ ...f, rates: f.rates.map((r, j) => j === i ? { ...r, [k]: v } : r) }))
  }

  function addCap() {
    setForm(f => ({ ...f, caps: [...f.caps, { category_id: '', cap_period: 'monthly', spend_limit: '' }] }))
  }

  function removeCap(i: number) {
    setForm(f => ({ ...f, caps: f.caps.filter((_, j) => j !== i) }))
  }

  function setCap(i: number, k: keyof CardFormData['caps'][0], v: string) {
    setForm(f => ({ ...f, caps: f.caps.map((c, j) => j === i ? { ...c, [k]: v } : c) }))
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Cards</h1>
        <div className="flex gap-2">
          <button onClick={openLibrary} className="btn-secondary">
            <Library size={16} /> Card Library
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Card
          </button>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="card p-10 text-center border-dashed border-2 border-gray-200">
          <p className="text-gray-500 font-medium">No cards yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your credit cards to start getting recommendations.</p>
          <button onClick={openAdd} className="btn-primary mt-4">
            <Plus size={16} /> Add First Card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {cards.map(card => {
            const cardRates = rates.filter(r => r.card_id === card.id)
            const cardCaps = caps.filter(c => c.card_id === card.id)
            return (
              <div key={card.id} className="card p-5">
                <div className="flex items-start gap-4">
                  {/* Color indicator */}
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
                      {!card.active && (
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">Base rate: {card.base_mpd} mpd</p>

                    {/* Rates */}
                    {cardRates.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {cardRates.map(r => {
                          const cat = categories.find(c => c.id === r.category_id)
                          return (
                            <span key={r.id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
                              {cat?.icon} {cat?.name}: {r.mpd} mpd
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
                              Cap: S${c.spend_limit}/{capPeriodLabel(c.cap_period).toLowerCase()}
                              {cat ? ` (${cat.name})` : ' (all)'}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(card)}
                      className="btn-secondary py-1.5 px-3 text-xs"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(card)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Card Library modal */}
      {showLibrary && (
        <Modal title="Card Library" onClose={() => setShowLibrary(false)} wide>
          <p className="text-sm text-gray-500 -mt-2">
            Select cards to add to your wallet. Cards you already own are greyed out.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {STARTER_CARDS.map((starter, i) => {
              const alreadyOwned = ownedKeys.has(`${starter.bank}|${starter.name}`)
              const isSelected = librarySelected.has(i)
              return (
                <button
                  key={i}
                  onClick={() => !alreadyOwned && toggleLibraryCard(i)}
                  disabled={alreadyOwned}
                  className={`relative rounded-xl p-4 text-left border-2 transition-all ${
                    alreadyOwned
                      ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm cursor-pointer'
                  }`}
                >
                  {/* Checkmark / owned badge */}
                  <div className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    alreadyOwned
                      ? 'bg-gray-300 border-gray-300'
                      : isSelected
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'border-gray-300 bg-white'
                  }`}>
                    {(alreadyOwned || isSelected) && <Check size={11} className="text-white" strokeWidth={3} />}
                  </div>

                  {/* Bank badge */}
                  <div
                    className="w-9 h-9 rounded-lg mb-2 flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: starter.color }}
                  >
                    {starter.bank.slice(0, 2).toUpperCase()}
                  </div>

                  <p className="font-semibold text-sm text-gray-900 leading-tight">{starter.bank}</p>
                  <p className="text-xs text-gray-400 leading-tight mt-0.5">{starter.name}</p>

                  <div className="mt-2 space-y-0.5">
                    {starter.rates.slice(0, 2).map((r, j) => (
                      <p key={j} className="text-xs text-indigo-600 font-medium">
                        {r.mpd} mpd · {r.label}
                      </p>
                    ))}
                    <p className="text-xs text-gray-400">{starter.base_mpd} mpd base</p>
                  </div>

                  {alreadyOwned && (
                    <p className="text-xs text-gray-400 mt-1 font-medium">Already added</p>
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-gray-500">
              {librarySelected.size > 0 ? `${librarySelected.size} card${librarySelected.size !== 1 ? 's' : ''} selected` : 'None selected'}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowLibrary(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={importLibraryCards}
                disabled={librarySelected.size === 0 || libraryImporting}
                className="btn-primary"
              >
                {libraryImporting
                  ? <><Loader2 size={14} className="animate-spin" /> Adding…</>
                  : `Add ${librarySelected.size || ''} Card${librarySelected.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal
          title={editCard ? `Edit: ${editCard.bank} ${editCard.name}` : 'Add New Card'}
          onClose={() => setShowModal(false)}
          wide
        >
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Bank</label>
              <input type="text" placeholder="DBS, UOB, OCBC…" className="input"
                value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} />
            </div>
            <div>
              <label className="label">Card Name</label>
              <input type="text" placeholder="Altitude Visa Signature" className="input"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Network</label>
              <div className="relative">
                <select
                  value={form.card_network}
                  onChange={e => setForm(f => ({ ...f, card_network: e.target.value }))}
                  className="input appearance-none pr-8"
                >
                  {CARD_NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="label">Base MPD</label>
              <input type="number" min="0.1" step="0.1" placeholder="1.2" className="input"
                value={form.base_mpd} onChange={e => setForm(f => ({ ...f, base_mpd: e.target.value }))} />
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="label">Card colour</label>
            <div className="flex flex-wrap gap-2 items-center">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor: form.color === c ? 'white' : 'transparent',
                    outlineColor: form.color === c ? c : 'transparent',
                    outlineStyle: 'solid',
                    outlineWidth: form.color === c ? '2px' : '0',
                    outlineOffset: '1px',
                  }}
                />
              ))}
              <input type="color" value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="w-7 h-7 rounded-full cursor-pointer border border-gray-200" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active-toggle"
              checked={form.active}
              onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600"
            />
            <label htmlFor="active-toggle" className="text-sm text-gray-700">Active (included in recommendations)</label>
          </div>

          {/* Bonus rates */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Bonus Earn Rates</label>
              <button type="button" onClick={addRate} className="text-xs text-indigo-600 hover:underline">
                + Add rate
              </button>
            </div>
            {form.rates.length === 0 && (
              <p className="text-xs text-gray-400">No bonus rates — base MPD applies to all categories.</p>
            )}
            <div className="space-y-2">
              {form.rates.map((r, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <select
                      value={r.category_id}
                      onChange={e => setRate(i, 'category_id', e.target.value)}
                      className="input text-sm appearance-none pr-7"
                    >
                      <option value="">Category…</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <input
                    type="number" min="0.1" step="0.1" placeholder="MPD"
                    value={r.mpd}
                    onChange={e => setRate(i, 'mpd', e.target.value)}
                    className="input w-24 text-sm"
                  />
                  <button type="button" onClick={() => removeRate(i)} className="text-gray-400 hover:text-red-500 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Spending caps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Spending Caps</label>
              <button type="button" onClick={addCap} className="text-xs text-indigo-600 hover:underline">
                + Add cap
              </button>
            </div>
            {form.caps.length === 0 && (
              <p className="text-xs text-gray-400">No spending caps — bonus rates are uncapped.</p>
            )}
            <div className="space-y-2">
              {form.caps.map((c, i) => (
                <div key={i} className="flex gap-2 items-center flex-wrap">
                  <div className="relative flex-1 min-w-[120px]">
                    <select
                      value={c.category_id}
                      onChange={e => setCap(i, 'category_id', e.target.value)}
                      className="input text-sm appearance-none pr-7"
                    >
                      <option value="">All categories</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="relative w-32">
                    <select
                      value={c.cap_period}
                      onChange={e => setCap(i, 'cap_period', e.target.value)}
                      className="input text-sm appearance-none pr-7"
                    >
                      {CAP_PERIODS.map(p => (
                        <option key={p} value={p}>{capPeriodLabel(p)}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <input
                    type="number" min="0" step="1" placeholder="S$ limit"
                    value={c.spend_limit}
                    onChange={e => setCap(i, 'spend_limit', e.target.value)}
                    className="input w-28 text-sm"
                  />
                  <button type="button" onClick={() => removeCap(i)} className="text-gray-400 hover:text-red-500 p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editCard ? 'Save Changes' : 'Add Card'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
