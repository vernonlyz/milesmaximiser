import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, Sparkles, Pencil, X, Search, Users, Info, Download, AlertTriangle, Star } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import VendorInput from '../components/VendorInput'
import { supabase } from '../lib/supabase'
import { recommendCards, calcMiles } from '../lib/recommendations'
import { isoDate, exportCsv, getPeriodEnd } from '../lib/utils'
import { TransactionFormData, CardRecommendation, Transaction, Vendor, TransactionFavourite } from '../lib/types'

const EMPTY_FORM: TransactionFormData = {
  card_id: '',
  category_id: '',
  amount: '',
  description: '',
  transaction_date: isoDate(),
}

type SortCol = 'date' | 'amount' | 'miles' | 'mpd'

export default function Transactions() {
  const { cards, allCards, selectedCardIds, categories, rates, caps, transactions, overrides, statementDays, mccCatalogue, vendorCatalogue, cashbackRates, refreshTransactions } = useApp()
  const { user } = useAuth()
  const location = useLocation()

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TransactionFormData>(EMPTY_FORM)
  const [favourites, setFavourites] = useState<TransactionFavourite[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Vendor / MCC state
  const [vendorName, setVendorName] = useState('')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [mcc, setMcc] = useState('')
  const [mccEditing, setMccEditing] = useState(false)
  const [mccInputVal, setMccInputVal] = useState('')

  const [paymentChannel, setPaymentChannel] = useState<'contactless' | 'online' | 'chip' | null>(null)

  // MPD override state
  const [mpdOverrideActive, setMpdOverrideActive] = useState(false)
  const [manualMpd, setManualMpd] = useState('')
  const [overrideNote, setOverrideNote] = useState('')

  // Group split state
  const [splitOpen, setSplitOpen] = useState(false)
  const [splitN, setSplitN] = useState<number | null>(null)
  const [splitCustom, setSplitCustom] = useState('')
  const [splitInfoOpen, setSplitInfoOpen] = useState(false)

  // Filters
  const nowYear = String(new Date().getFullYear())
  const [filterYear,     setFilterYear]     = useState(nowYear)
  const [filterMonthNum, setFilterMonthNum] = useState(() => String(new Date().getMonth() + 1).padStart(2, '0'))
  const [filterCat,  setFilterCat]  = useState('')
  const [filterCard, setFilterCard] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Transactions pool — current year comes from AppContext; previous years fetched on demand
  const [prevYearTxns, setPrevYearTxns] = useState<Transaction[]>([])
  const [loadingYear,  setLoadingYear]  = useState(false)

  // Sort
  const [sortBy, setSortBy] = useState<SortCol>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Auto-open the add modal when navigated here with { state: { openModal: true } }
  useEffect(() => {
    if ((location.state as { openModal?: boolean } | null)?.openModal) {
      openAdd()
      window.history.replaceState({}, '')
    }
  }, [])

  // Fetch previous year transactions from Supabase when filterYear changes
  useEffect(() => {
    if (filterYear === nowYear) {
      setPrevYearTxns([])
      return
    }
    let cancelled = false
    setLoadingYear(true)
    supabase
      .from('transactions')
      .select('id, transaction_date, amount, personal_amount, miles_earned, cashback_earned, effective_mpd, computed_mpd, manual_mpd, override_note, mcc, category_id, card_id, vendor_name, description, payment_channel')
      .gte('transaction_date', `${filterYear}-01-01`)
      .lt('transaction_date', `${parseInt(filterYear) + 1}-01-01`)
      .order('transaction_date', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setPrevYearTxns((data as Transaction[]) ?? [])
          setLoadingYear(false)
        }
      })
    return () => { cancelled = true }
  }, [filterYear])

  function toggleSort(col: SortCol) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  function handleExport() {
    const headers = ['Date', 'Vendor', 'Category', 'Card', 'Amount (S$)', 'Personal Amount (S$)', 'Payment Channel', 'Miles Earned', 'MPD', 'Cashback Earned (S$)', 'Notes']
    const rows = filtered.map(t => {
      const card = cards.find(c => c.id === t.card_id) ?? allCards.find(c => c.id === t.card_id)
      const cat = categories.find(c => c.id === t.category_id)
      return [
        t.transaction_date,
        t.vendor_name ?? '',
        cat ? cat.name : '',
        card ? (card.card_type === 'debit' ? card.name : `${card.bank} ${card.name}`) : '',
        t.amount.toFixed(2),
        (t.personal_amount ?? t.amount).toFixed(2),
        t.payment_channel ?? '',
        t.miles_earned != null ? Math.round(t.miles_earned) : '',
        t.effective_mpd != null ? t.effective_mpd.toFixed(4) : '',
        t.cashback_earned != null ? t.cashback_earned.toFixed(4) : '',
        t.description ?? '',
      ]
    })
    const exportPeriod = filterMonthNum ? `${filterYear}-${filterMonthNum}` : filterYear
    exportCsv(`transactions_${exportPeriod}.csv`, headers, rows)
  }

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

  const personalAmount = useMemo(() => {
    const amt = parseFloat(form.amount)
    if (!splitOpen || isNaN(amt) || amt <= 0) return null
    if (splitN != null && splitN >= 2) return parseFloat((amt / splitN).toFixed(2))
    const custom = parseFloat(splitCustom)
    return (!isNaN(custom) && custom >= 0 && custom <= amt) ? custom : null
  }, [splitOpen, splitN, splitCustom, form.amount])

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
    setSplitOpen(false)
    setSplitN(null)
    setSplitCustom('')
    setSplitInfoOpen(false)
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
    if (t.personal_amount != null && t.personal_amount !== t.amount) {
      setSplitOpen(true)
      setSplitN(null)
      setSplitCustom(t.personal_amount.toFixed(2))
    } else {
      setSplitOpen(false)
      setSplitN(null)
      setSplitCustom('')
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
    setManualMpd(nominalComputedMpd != null ? nominalComputedMpd.toFixed(2) : '')
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

    const card = (cards.find(c => c.id === form.card_id) ?? allCards.find(c => c.id === form.card_id))!
    const txDate = form.transaction_date ? new Date(form.transaction_date) : new Date()

    // Cashback cards: compute cashback_earned; skip the miles engine entirely
    let cashback_earned: number | null = null
    let engineMpd = 0
    if (card.card_type === 'cashback') {
      const override = cashbackRates.find(r => r.card_id === card.id && r.category_id === form.category_id)
      const rate = override?.cashback_rate ?? card.cashback_rate ?? 0
      cashback_earned = parseFloat((amount * rate).toFixed(4))
    } else if (card.card_type === 'miles') {
      ;({ effectiveMpd: engineMpd } = calcMiles(card, rates, caps, form.category_id, amount, transactions, txDate, overrides, paymentChannel, statementDays))
    }

    const parsedManual = parseFloat(manualMpd)
    const hasValidOverride = card.card_type === 'miles' && mpdOverrideActive && !isNaN(parsedManual) && parsedManual > 0

    // Apply the same block rounding to manual overrides that the engine applies automatically.
    const saveEarnAmount = Math.floor(amount / card.earn_increment) * card.earn_increment
    const overrideMiles = Math.round(saveEarnAmount * parsedManual)
    const overrideEffectiveMpd = amount > 0 ? overrideMiles / amount : 0

    const payload = {
      card_id: form.card_id,
      category_id: form.category_id,
      amount,
      description: form.description || null,
      vendor_name: vendorName.trim() || null,
      mcc: mcc.trim() || null,
      payment_channel: paymentChannel,
      transaction_date: form.transaction_date,
      computed_mpd: card.card_type === 'miles' ? parseFloat(engineMpd.toFixed(4)) : null,
      manual_mpd: hasValidOverride ? parseFloat(parsedManual.toFixed(4)) : null,
      override_note: hasValidOverride && overrideNote.trim() ? overrideNote.trim() : null,
      effective_mpd: card.card_type === 'miles' ? parseFloat((hasValidOverride ? overrideEffectiveMpd : engineMpd).toFixed(4)) : null,
      miles_earned: card.card_type === 'miles' ? (hasValidOverride ? overrideMiles : Math.round(amount * engineMpd)) : null,
      cashback_earned,
      personal_amount: personalAmount,
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

  // Top 6 most-used vendors from transaction history (for quick-pick chips)
  const frequentVendors = useMemo(() => {
    const counts = new Map<string, { name: string; count: number; category_id: string | null }>()
    for (const t of transactions) {
      if (!t.vendor_name) continue
      const key = t.vendor_name.toLowerCase()
      const existing = counts.get(key)
      if (existing) existing.count++
      else counts.set(key, { name: t.vendor_name, count: 1, category_id: t.category_id })
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6)
  }, [transactions])

  function handleQuickVendor(v: { name: string; category_id: string | null }) {
    setVendorName(v.name)
    setSelectedVendor(null)
    if (v.category_id) setField('category_id', v.category_id)
    const catalogueMatch = vendorCatalogue.find(c => c.name.toLowerCase() === v.name.toLowerCase())
    if (catalogueMatch?.default_mcc) setMcc(catalogueMatch.default_mcc)
  }

  // ---- favourites (saved transaction templates) ----
  useEffect(() => { loadFavourites() }, [])

  async function loadFavourites() {
    const { data } = await supabase
      .from('transaction_favourites')
      .select('*')
      .order('created_at', { ascending: false })
    setFavourites((data as TransactionFavourite[]) ?? [])
  }

  // Prefill the form from a favourite; date defaults to today, miles recompute live.
  function applyFavourite(f: TransactionFavourite) {
    setForm({
      card_id: f.card_id ?? '',
      category_id: f.category_id ?? '',
      amount: f.amount != null ? String(f.amount) : '',
      description: f.description ?? '',
      transaction_date: isoDate(),
    })
    setVendorName(f.vendor_name ?? '')
    setSelectedVendor(null)
    setMcc(f.mcc ?? '')
    setPaymentChannel(f.payment_channel)
    setMpdOverrideActive(false)
    setManualMpd('')
    setOverrideNote('')
    setSplitOpen(false)
    setSplitN(null)
    setSplitCustom('')
    setError(null)
  }

  async function saveAsFavourite() {
    if (!form.card_id && !vendorName.trim()) {
      setError('Pick a card or vendor before saving a favourite.')
      return
    }
    const fallback = vendorName.trim() || categories.find(c => c.id === form.category_id)?.name || 'Favourite'
    const input = window.prompt('Name this favourite', fallback)
    if (input === null) return
    const label = input.trim() || fallback
    const { error: e } = await supabase.from('transaction_favourites').insert({
      user_id: user!.id,
      label,
      card_id: form.card_id || null,
      category_id: form.category_id || null,
      vendor_name: vendorName.trim() || null,
      mcc: mcc.trim() || null,
      payment_channel: paymentChannel,
      amount: form.amount ? parseFloat(form.amount) : null,
      description: form.description || null,
    })
    if (e) { setError(e.message); return }
    loadFavourites()
  }

  async function deleteFavourite(id: string) {
    await supabase.from('transaction_favourites').delete().eq('id', id)
    setFavourites(prev => prev.filter(f => f.id !== id))
  }

  // Active transaction pool — current year from AppContext, previous years from Supabase
  const txPool = filterYear === nowYear ? transactions : prevYearTxns

  // Filtered + sorted transactions
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const monthPrefix = filterMonthNum ? `${filterYear}-${filterMonthNum}` : null
    const result = txPool.filter(t => {
      if (monthPrefix && !t.transaction_date.startsWith(monthPrefix)) return false
      if (filterCat  && t.category_id !== filterCat)  return false
      if (filterCard && t.card_id     !== filterCard)  return false
      if (q && !t.vendor_name?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false
      return true
    })
    return [...result].sort((a, b) => {
      let v = 0
      if (sortBy === 'date')   v = a.transaction_date.localeCompare(b.transaction_date)
      if (sortBy === 'amount') v = a.amount - b.amount
      if (sortBy === 'miles')  v = (a.miles_earned ?? 0) - (b.miles_earned ?? 0)
      if (sortBy === 'mpd')    v = (a.effective_mpd ?? 0) - (b.effective_mpd ?? 0)
      return sortDir === 'desc' ? -v : v
    })
  }, [txPool, filterYear, filterMonthNum, filterCat, filterCard, searchQuery, sortBy, sortDir])

  const totalMiles = filtered.reduce((s, t) => s + (t.miles_earned ?? 0), 0)
  const totalSpent = filtered.reduce((s, t) => s + t.amount, 0)

  // Nominal MPD for the current form — strips out the rounding factor so we show "4 mpd"
  // rather than the slightly-lower effective value (e.g. 3.96 mpd on a $13.80 / $5-block card).
  // earnAmount is the amount the bank actually awards miles on.
  const formCard = cards.find(c => c.id === form.card_id) ?? allCards.find(c => c.id === form.card_id)
  const formAmt = parseFloat(form.amount) || 0
  const earnAmount = formCard && formAmt > 0
    ? Math.floor(formAmt / formCard.earn_increment) * formCard.earn_increment
    : formAmt
  const nominalComputedMpd = computedMpd != null && earnAmount > 0
    ? parseFloat((computedMpd * formAmt / earnAmount).toFixed(4))
    : computedMpd

  // Live preview in modal
  const parsedManualMpd = parseFloat(manualMpd)
  const previewMpd = mpdOverrideActive && !isNaN(parsedManualMpd) && parsedManualMpd > 0
    ? parsedManualMpd
    : computedMpd
  const previewMiles = formCard?.card_type === 'miles' && previewMpd != null && formAmt > 0
    ? mpdOverrideActive
      ? Math.round(earnAmount * previewMpd)   // manual: apply block rounding
      : Math.round(formAmt * previewMpd)      // computed: effectiveMpd already has rounding baked in
    : null

  const previewCashback = formCard?.card_type === 'cashback' && formAmt > 0
    ? (() => {
        const override = cashbackRates.find(r => r.card_id === formCard.id && r.category_id === form.category_id)
        const rate = override?.cashback_rate ?? formCard.cashback_rate ?? 0
        return parseFloat((formAmt * rate).toFixed(2))
      })()
    : null

  // Cycle-end proximity warning — shown when tx date is within 5 days of cycle end
  const cycleWarning = useMemo(() => {
    if (!formCard || formCard.card_type === 'debit' || !form.transaction_date) return null
    const [y, mo, d] = form.transaction_date.split('-').map(Number)
    const txDate = new Date(y, mo - 1, d)
    const statDay = statementDays.get(formCard.id)
    const periodEnd = getPeriodEnd('monthly', txDate, statDay)
    const daysLeft = Math.round((periodEnd.getTime() - txDate.getTime()) / 86400000)
    if (daysLeft < 0 || daysLeft > 5) return null
    const endLabel = periodEnd.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
    return { daysLeft, endLabel }
  }, [formCard, form.transaction_date, statementDays])

  // MCC display helper
  const mccDescription = mcc ? mccCatalogue.find(m => m.code === mcc)?.description : undefined

  const mccSuggestions = useMemo(() => {
    if (!mccEditing || /^\d*$/.test(mccInputVal) || mccInputVal.length < 2) return []
    const q = mccInputVal.toLowerCase()
    return mccCatalogue.filter(m => m.description.toLowerCase().includes(q)).slice(0, 8)
  }, [mccEditing, mccInputVal, mccCatalogue])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <button onClick={handleExport} className="btn-secondary text-xs">
              <Download size={13} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} />
            <span className="hidden sm:inline">Log Transaction</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        {/* Year select */}
        <div className="relative">
          <select
            value={filterYear}
            onChange={e => { setFilterYear(e.target.value); setFilterMonthNum('') }}
            className="input w-24 appearance-none pr-7 text-sm"
          >
            {Array.from({ length: parseInt(nowYear) - 2023 }, (_, i) => String(parseInt(nowYear) - i)).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Month select */}
        <div className="relative">
          <select
            value={filterMonthNum}
            onChange={e => setFilterMonthNum(e.target.value)}
            className="input w-32 appearance-none pr-7 text-sm"
          >
            <option value="">All months</option>
            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((name, i) => (
              <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {loadingYear && <span className="text-xs text-gray-400 self-center">Loading…</span>}

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
            {allCards.filter(c => c.card_type === 'debit').map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search vendor or notes…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input pl-7 text-sm w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="ml-auto flex gap-4 items-center text-sm text-gray-500 shrink-0">
          <span>S${totalSpent.toFixed(2)} spent</span>
          <span className="text-indigo-600 font-medium">+{Math.round(totalMiles).toLocaleString()} miles</span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">No transactions found.</div>
        ) : (
          <>
            {/* ── Mobile: card list (hidden on sm+) ── */}
            <div className="sm:hidden divide-y divide-gray-100">
              {filtered.map(t => {
                const card = cards.find(c => c.id === t.card_id) ?? allCards.find(c => c.id === t.card_id)
                const cat  = categories.find(c => c.id === t.category_id)
                const isManual = t.manual_mpd != null
                const primaryLabel = t.vendor_name || t.description || cat?.name || '—'
                const notesLine = t.vendor_name && t.description ? t.description : null
                let nomMpd: number | null = null
                if (t.effective_mpd != null) {
                  if (isManual && t.manual_mpd != null) {
                    nomMpd = t.manual_mpd
                  } else {
                    const earnAmt = card
                      ? Math.floor(t.amount / card.earn_increment) * card.earn_increment
                      : t.amount
                    nomMpd = card && earnAmt > 0
                      ? parseFloat((t.effective_mpd * t.amount / earnAmt).toFixed(2))
                      : t.effective_mpd
                  }
                }
                return (
                  <div key={t.id} className="px-4 py-3">
                    {/* Vendor + miles */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {card && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: card.color }}
                          />
                        )}
                        <span className="font-medium text-gray-800 truncate">{primaryLabel}</span>
                      </div>
                      <span className="text-indigo-600 font-medium text-sm shrink-0">
                        {t.miles_earned != null ? `+${Math.round(t.miles_earned).toLocaleString()} mi` : '—'}
                      </span>
                    </div>
                    {/* Notes */}
                    {notesLine && (
                      <p className="text-xs text-gray-500 mt-0.5 ml-3.5 truncate">{notesLine}</p>
                    )}
                    {/* Category · channel · date | amount */}
                    <div className="flex items-center justify-between mt-1 ml-3.5">
                      <span className="text-xs text-gray-500">
                        {cat ? `${cat.icon} ${cat.name}` : ''}
                        {t.payment_channel === 'contactless' && <span className="text-indigo-400"> · tap</span>}
                        {t.payment_channel === 'online'      && <span className="text-sky-400"> · online</span>}
                        <span className="text-gray-400"> · {t.transaction_date}</span>
                      </span>
                      <span className="font-medium text-gray-800 text-sm">S${t.amount.toFixed(2)}</span>
                    </div>
                    {t.personal_amount != null && t.personal_amount !== t.amount && (
                      <p className="text-xs text-indigo-500 ml-3.5 mt-0.5">
                        yours: S${t.personal_amount.toFixed(2)}
                      </p>
                    )}
                    {/* Card name | mpd + actions */}
                    <div className="flex items-center justify-between mt-0.5 ml-3.5">
                      <span className="text-xs text-gray-400">
                        {card ? (card.bank && card.bank !== 'Cash' ? `${card.bank} ${card.name}` : card.name) : ''}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {nomMpd != null && (
                          <span className="text-xs text-gray-400 mr-1 flex items-center gap-0.5">
                            {isManual && <Pencil size={9} className="text-amber-400" />}
                            {nomMpd} mpd
                          </span>
                        )}
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
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Desktop: table (hidden below sm) ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <SortTh col="date"   label="Date"   active={sortBy} dir={sortDir} onSort={toggleSort} align="left" />
                    <th className="text-left px-4 py-3">Vendor / Description</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Card</th>
                    <SortTh col="amount" label="Amount" active={sortBy} dir={sortDir} onSort={toggleSort} align="right" />
                    <SortTh col="miles"  label="Miles"  active={sortBy} dir={sortDir} onSort={toggleSort} align="right" />
                    <SortTh col="mpd"    label="MPD"    active={sortBy} dir={sortDir} onSort={toggleSort} align="right" className="hidden md:table-cell" />
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(t => {
                    const card = cards.find(c => c.id === t.card_id) ?? allCards.find(c => c.id === t.card_id)
                    const cat  = categories.find(c => c.id === t.category_id)
                    const isManual = t.manual_mpd != null
                    const primaryLabel = t.vendor_name || t.description || cat?.name || '—'
                    const notesLine = t.vendor_name && t.description ? t.description : null
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{t.transaction_date}</td>
                        <td className="px-4 py-3 text-gray-800">
                          <span className="block">{primaryLabel}</span>
                          {notesLine && (
                            <span className="block text-xs text-gray-500 mt-0.5">{notesLine}</span>
                          )}
                          {t.mcc && (
                            <span className="block text-xs text-gray-400 font-mono mt-0.5">
                              {t.mcc}
                              {mccCatalogue.find(m => m.code === t.mcc) && (
                                <span className="ml-1 not-italic font-sans">
                                  · {mccCatalogue.find(m => m.code === t.mcc)!.description}
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {cat ? `${cat.icon} ${cat.name}` : '—'}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {card ? (
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: card.color }}
                              />
                              <span className="text-gray-700">{card.bank && card.bank !== 'Cash' ? `${card.bank} ${card.name}` : card.name}</span>
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
                          {t.personal_amount != null && t.personal_amount !== t.amount && (
                            <span className="block text-xs text-indigo-500 font-normal">
                              S${t.personal_amount.toFixed(2)} yours
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {t.miles_earned != null
                            ? <span className="text-indigo-600 font-medium">+{Math.round(t.miles_earned).toLocaleString()}</span>
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right hidden md:table-cell text-gray-400 text-xs">
                          {t.effective_mpd != null ? (() => {
                            // Manual overrides: use stored manual_mpd as the nominal — it's exactly
                            // what the user entered and avoids inflation from the reconstruction formula.
                            // Computed transactions: reconstruct nominal from effective_mpd + block size.
                            let nomMpd: number
                            if (isManual && t.manual_mpd != null) {
                              nomMpd = t.manual_mpd
                            } else {
                              const tEarnAmt = card
                                ? Math.floor(t.amount / card.earn_increment) * card.earn_increment
                                : t.amount
                              nomMpd = card && tEarnAmt > 0
                                ? parseFloat((t.effective_mpd * t.amount / tEarnAmt).toFixed(2))
                                : t.effective_mpd
                            }
                            return (
                              <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
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
                                {nomMpd} mpd
                              </span>
                            )
                          })() : '—'}
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
            </div>
          </>
        )}
      </div>

      {/* Add / Edit modal */}
      {showModal && (
        <Modal
          title={editingId ? 'Edit Transaction' : 'Log Transaction'}
          onClose={() => setShowModal(false)}
        >
          {/* Favourites — quick prefill, only when adding */}
          {!editingId && favourites.length > 0 && (
            <div>
              <label className="label flex items-center gap-1">
                <Star size={12} className="text-amber-400" /> Favourites
              </label>
              <div className="flex flex-wrap gap-1.5">
                {favourites.map(f => (
                  <span
                    key={f.id}
                    className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 text-amber-800 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => applyFavourite(f)}
                      className="text-xs pl-2.5 pr-1.5 py-1 hover:bg-amber-100 transition-colors"
                    >
                      {f.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFavourite(f.id)}
                      title="Delete favourite"
                      className="text-amber-400 hover:text-red-500 pr-1.5 py-1"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.transaction_date}
              onChange={e => setField('transaction_date', e.target.value)} />
          </div>

          {/* Vendor typeahead */}
          <div>
            <label className="label">Vendor</label>
            {/* Frequent vendor chips — only shown when field is empty and not editing */}
            {!vendorName && !editingId && frequentVendors.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {frequentVendors.map(v => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => handleQuickVendor(v)}
                    className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            )}
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

          <div>
            <label className="label">Notes <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
            <input type="text" placeholder="Additional notes…" className="input"
              value={form.description} onChange={e => setField('description', e.target.value)} />
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
              <div className="relative">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={mccInputVal}
                    onChange={e => {
                      const val = e.target.value
                      if (/^\d*$/.test(val)) {
                        const digits = val.slice(0, 4)
                        setMccInputVal(digits)
                        setMcc(digits)
                      } else {
                        setMccInputVal(val)
                      }
                    }}
                    onBlur={() => setMccEditing(false)}
                    placeholder="Code (5814) or keyword (dining)…"
                    className="input flex-1 font-mono text-sm"
                    autoFocus
                  />
                  {/^\d+$/.test(mccInputVal) && mcc.length === 4 && mccDescription ? (
                    <span className="text-sm text-gray-600 shrink-0">{mccDescription}</span>
                  ) : /^\d+$/.test(mccInputVal) && mcc.length > 0 ? (
                    <span className="text-xs text-gray-400 italic shrink-0">Unknown MCC</span>
                  ) : null}
                </div>
                {mccSuggestions.length > 0 && (
                  <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {mccSuggestions.map(m => (
                      <li key={m.code}>
                        <button
                          type="button"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => { setMcc(m.code); setMccInputVal(m.code); setMccEditing(false) }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2"
                        >
                          <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded shrink-0">{m.code}</span>
                          <span className="text-gray-700">{m.description}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
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
                  onClick={() => { setMccInputVal(mcc); setMccEditing(true) }}
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
                onClick={() => { setMccInputVal(''); setMccEditing(true) }}
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

            {/* Group split */}
            {!splitOpen ? (
              <div className="mt-1.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setSplitOpen(true); setSplitInfoOpen(false) }}
                    className="text-xs text-gray-400 hover:text-indigo-500 transition-colors flex items-center gap-1"
                  >
                    <Users size={11} /> Split with group?
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitInfoOpen(p => !p)}
                    className={`transition-colors ${splitInfoOpen ? 'text-indigo-500' : 'text-gray-300 hover:text-gray-400'}`}
                    title="What is this?"
                  >
                    <Info size={11} />
                  </button>
                </div>
                {splitInfoOpen && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 leading-relaxed">
                    Useful when you foot the bill for a group. Your card earns miles on the full charge; only your actual expense is split.
                    <span className="block mt-1 text-blue-500">e.g. $120 dinner ÷ 4 = $30 yours, but you earn miles on $120.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2 bg-gray-50 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                    <Users size={12} className="text-gray-400" /> Split with group
                  </span>
                  <button
                    type="button"
                    onClick={() => { setSplitOpen(false); setSplitN(null); setSplitCustom('') }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {[2, 3, 4].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => { setSplitN(n); setSplitCustom('') }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        splitN === n
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      ÷{n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSplitN(null)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      splitN === null
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {splitN === null && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Your share (S$)"
                    className="input text-sm"
                    value={splitCustom}
                    onChange={e => setSplitCustom(e.target.value)}
                  />
                )}
                {personalAmount != null && (
                  <p className="text-xs text-indigo-600 font-medium">
                    Your share: S${personalAmount.toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Live recommendation — miles cards only, only shown when adding */}
          {formCard?.card_type !== 'cashback' && formCard?.card_type !== 'debit' && !editingId && recs.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                <Sparkles size={12} /> Recommendation
              </p>
              {recs.slice(0, 3).map((rec, i) => (
                <button
                  key={rec.card.id}
                  type="button"
                  onClick={() => setField('card_id', rec.card.id)}
                  className={`w-full flex items-start gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                    form.card_id === rec.card.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white hover:bg-indigo-100 text-gray-700'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                    style={{ backgroundColor: rec.card.color }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block leading-snug">
                      {i === 0 && '⭐ '}{rec.card.bank} {rec.card.name}
                    </span>
                    <span className="flex items-center gap-1.5 mt-0.5">
                      <StatusBadge status={rec.status} />
                      <span className={`text-xs font-semibold ${form.card_id === rec.card.id ? 'text-white' : 'text-gray-500'}`}>
                        {rec.bonusMpd.toFixed(2)} mpd
                      </span>
                    </span>
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
                {allCards.filter(c => c.card_type === 'debit' && !selectedCardIds.has(c.id)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Cycle-end proximity warning */}
          {cycleWarning && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <span className="font-medium">
                  {cycleWarning.daysLeft === 0
                    ? 'Last day of billing cycle.'
                    : `${cycleWarning.daysLeft} day${cycleWarning.daysLeft > 1 ? 's' : ''} left in billing cycle (ends ${cycleWarning.endLabel}).`}
                </span>{' '}
                If the bank posts this transaction in the next cycle, your cap resets and it may earn at the base rate instead.
              </p>
            </div>
          )}

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

          {/* MPD section — miles cards only, appears once card + category + amount are set */}
          {formCard?.card_type === 'miles' && computedMpd !== null && (
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
                    ↺ Reset to computed ({nominalComputedMpd?.toFixed(2)} mpd)
                  </button>
                )}
              </div>

              {!mpdOverrideActive ? (
                <div className="space-y-1">
                  <div className="input bg-gray-50 flex items-center justify-between text-gray-600 cursor-default select-none">
                    <span>{nominalComputedMpd?.toFixed(2)} mpd</span>
                    <span className="text-xs text-gray-400">computed</span>
                  </div>
                  {formCard && earnAmount > 0 && earnAmount !== formAmt && (
                    <p className="text-xs text-gray-400">
                      earns on S${earnAmount.toFixed(2)} of S${formAmt.toFixed(2)} (rounded to ${formCard.earn_increment} block)
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder={nominalComputedMpd?.toFixed(2)}
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
              {previewCashback != null && (
                <p className="text-xs text-gray-400 mt-1.5 text-right">
                  Est. cashback:{' '}
                  <span className="text-emerald-600 font-medium">S${previewCashback.toFixed(2)}</span>
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {!editingId && (
            <button
              type="button"
              onClick={saveAsFavourite}
              className="flex items-center justify-center gap-1.5 w-full text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 py-1.5 rounded-lg transition-colors"
            >
              <Star size={12} /> Save as favourite for quick reuse
            </button>
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

function SortTh({
  col, label, active, dir, onSort, align, className = '',
}: {
  col: SortCol; label: string; active: SortCol; dir: 'asc' | 'desc'
  onSort: (col: SortCol) => void; align: 'left' | 'right'; className?: string
}) {
  const isActive = active === col
  return (
    <th
      className={`px-4 py-3 cursor-pointer select-none whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${isActive ? 'text-indigo-600' : 'hover:text-gray-700'} ${className}`}
      onClick={() => onSort(col)}
    >
      {label}
      <span className="ml-1 inline-block w-3 text-center">
        {isActive ? (dir === 'desc' ? '↓' : '↑') : '↕'}
      </span>
    </th>
  )
}
