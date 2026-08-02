import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, Sparkles, Pencil, X, Search, Users, Info, Download, AlertTriangle, Star, Repeat, CheckCircle2, Circle, Receipt, TrendingUp, Percent, Wallet } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import PartialBonusNote from '../components/PartialBonusNote'
import DatePicker from '../components/DatePicker'
import VendorInput from '../components/VendorInput'
import { supabase } from '../lib/supabase'
import { recommendCards, calcMiles } from '../lib/recommendations'
import { resolveMccEligibility } from '../lib/mcc'
import { isoDate, exportCsv, getPeriodEnd } from '../lib/utils'
import { TransactionFormData, CardRecommendation, Transaction, Vendor, TransactionFavourite } from '../lib/types'

type RecurUnit = 'day' | 'week' | 'month' | 'year'
const RECUR_UNITS: RecurUnit[] = ['day', 'week', 'month', 'year']

// Add N units to a YYYY-MM-DD date (local), returning YYYY-MM-DD.
function addUnit(dateStr: string, unit: RecurUnit, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  if (unit === 'day') dt.setDate(dt.getDate() + n)
  else if (unit === 'week') dt.setDate(dt.getDate() + 7 * n)
  else if (unit === 'month') dt.setMonth(dt.getMonth() + n)
  else dt.setFullYear(dt.getFullYear() + n)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

// Occurrence dates of a recurring rule that fall on/after `todayStr` and within the
// horizon, honoring end_date / max_occurrences (counted from start_date).
function futureOccurrences(fav: TransactionFavourite, todayStr: string, horizonStr: string): string[] {
  if (!fav.recur_unit || !fav.start_date) return []
  const interval = Math.max(1, fav.recur_interval || 1)
  const out: string[] = []
  let cur = fav.start_date
  let count = 0
  while (count <= 600) {
    if (fav.max_occurrences != null && count >= fav.max_occurrences) break
    if (fav.end_date && cur > fav.end_date) break
    if (cur > horizonStr) break
    if (cur >= todayStr) out.push(cur)
    count++
    cur = addUnit(cur, fav.recur_unit, interval)
  }
  return out
}

function recurLabel(f: TransactionFavourite): string {
  if (!f.recur_unit) return ''
  const n = f.recur_interval || 1
  const every = n === 1 ? `every ${f.recur_unit}` : `every ${n} ${f.recur_unit}s`
  const end = f.end_date ? ` · until ${f.end_date}` : f.max_occurrences != null ? ` · ${f.max_occurrences}×` : ''
  return every + end
}

const EMPTY_FORM: TransactionFormData = {
  card_id: '',
  category_id: '',
  amount: '',
  description: '',
  transaction_date: isoDate(),
}

type SortCol = 'date' | 'amount' | 'miles' | 'mpd'

export default function Transactions() {
  const { cards, allCards, selectedCardIds, categories, rates, caps, transactions, overrides, statementDays, boosts, mccCatalogue, vendorCatalogue, cashbackRates, cardMccEligibility, refreshTransactions } = useApp()
  const { user } = useAuth()
  const toast = useToast()
  const location = useLocation()

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<TransactionFormData>(EMPTY_FORM)
  const [favourites, setFavourites] = useState<TransactionFavourite[]>([])
  const [favToDelete, setFavToDelete] = useState<TransactionFavourite | null>(null)
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null)
  const [favNameOpen, setFavNameOpen] = useState(false)
  const [favNameInput, setFavNameInput] = useState('')
  // Standalone recurring-rule editor (create/edit) — reuses the shared transaction
  // form state (form/vendorName/mcc/paymentChannel) so its fields match logging.
  const [recurEditorOpen, setRecurEditorOpen] = useState(false)
  const [editingFavId, setEditingFavId] = useState<string | null>(null)
  const [recName, setRecName] = useState('')
  const [recurUnit, setRecurUnit] = useState<RecurUnit>('month')
  const [recurInterval, setRecurInterval] = useState('1')
  const [recurStart, setRecurStart] = useState('')
  const [recurEndMode, setRecurEndMode] = useState<'never' | 'date' | 'count'>('never')
  const [recurEndDate, setRecurEndDate] = useState('')
  const [recurCount, setRecurCount] = useState('12')
  const [upcoming, setUpcoming] = useState<Transaction[]>([])
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [upcomingCollapsed, setUpcomingCollapsed] = useState(() => localStorage.getItem('txnUpcomingCollapsed') === '1')
  const [upcomingRange, setUpcomingRange] = useState<'1m' | '3m' | '6m' | 'all'>(() => (localStorage.getItem('txnUpcomingRange') as '1m' | '3m' | '6m' | 'all') || '1m')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const todayStr = new Date().toLocaleDateString('en-CA')

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

  // Group split state. 'even' = divide by N (chips or custom divisor); 'amount' = exact $ share.
  const [splitOpen, setSplitOpen] = useState(false)
  const [splitMode, setSplitMode] = useState<'even' | 'amount'>('even')
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
  // Optional date range (overrides year/month when set); can be open-ended.
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [rangePool, setRangePool] = useState<Transaction[]>([])

  // Reconciliation
  const [reconcileFilter, setReconcileFilter] = useState<'all' | 'unreconciled' | 'reconciled'>('all')
  const [statementTotal, setStatementTotal] = useState('')
  const [reconOverrides, setReconOverrides] = useState<Record<string, boolean>>({})
  const isReconciled = (t: Transaction) => reconOverrides[t.id] ?? t.reconciled

  // Transactions pool — current year comes from AppContext; previous years fetched on demand
  const [prevYearTxns, setPrevYearTxns] = useState<Transaction[]>([])
  const [loadingYear,  setLoadingYear]  = useState(false)

  // Sort
  const [sortBy, setSortBy] = useState<SortCol>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Handle navigation intents: open the add modal, reveal all upcoming, or filter to a card.
  useEffect(() => {
    const st = location.state as { openModal?: boolean; presetCash?: boolean; showUpcoming?: 'all'; filterCardId?: string } | null
    if (st?.presetCash) {
      openAdd(allCards.find(c => c.card_type === 'debit')?.id)
      window.history.replaceState({}, '')
    } else if (st?.openModal) {
      openAdd()
      window.history.replaceState({}, '')
    } else if (st?.showUpcoming === 'all') {
      setFilterMonthNum('')   // clear the current-month filter so Upcoming isn't hidden
      setUpcomingRange('all')
      setUpcomingCollapsed(false)
      window.history.replaceState({}, '')
    } else if (st?.filterCardId) {
      setFilterCard(st.filterCardId)   // keeps the default current-month filter
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
      .select('id, transaction_date, amount, personal_amount, miles_earned, cashback_earned, effective_mpd, computed_mpd, manual_mpd, override_note, mcc, category_id, card_id, vendor_name, description, payment_channel, reconciled')
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

  // When a date range is set, fetch that window from Supabase (can span years / include future).
  const rangeActive = !!(dateFrom || dateTo)
  useEffect(() => {
    if (!rangeActive || !user) { setRangePool([]); return }
    let cancelled = false
    setLoadingYear(true)
    let q = supabase.from('transactions')
      .select('id, transaction_date, amount, personal_amount, miles_earned, cashback_earned, effective_mpd, computed_mpd, manual_mpd, override_note, mcc, category_id, card_id, vendor_name, description, payment_channel, reconciled, recurring_id')
      .eq('user_id', user.id)
    if (dateFrom) q = q.gte('transaction_date', dateFrom)
    if (dateTo)   q = q.lte('transaction_date', dateTo)
    q.order('transaction_date', { ascending: false }).then(({ data }) => {
      if (!cancelled) { setRangePool((data as Transaction[]) ?? []); setLoadingYear(false) }
    })
    return () => { cancelled = true }
  }, [rangeActive, dateFrom, dateTo, user?.id])

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
    const exportPeriod = rangeActive ? `${dateFrom || 'start'}_to_${dateTo || 'end'}` : filterMonthNum ? `${filterYear}-${filterMonthNum}` : filterYear
    exportCsv(`transactions_${exportPeriod}.csv`, headers, rows)
  }

  // Engine-computed MPD for the current form selection
  const computedMpd = useMemo(() => {
    const amt = parseFloat(form.amount)
    if (!form.card_id || !form.category_id || isNaN(amt) || amt <= 0) return null
    const card = cards.find(c => c.id === form.card_id)
    if (!card) return null
    const txDate = form.transaction_date ? new Date(form.transaction_date) : new Date()
    return calcMiles(card, rates, caps, form.category_id, amt, transactions, txDate, overrides, paymentChannel, statementDays, boosts).effectiveMpd
  }, [form.card_id, form.category_id, form.amount, form.transaction_date, cards, rates, caps, transactions, overrides, paymentChannel, statementDays, boosts])

  // Live recommendations while filling form
  const recs = useMemo<CardRecommendation[]>(() => {
    const amt = parseFloat(form.amount)
    if (!form.category_id || isNaN(amt) || amt <= 0) return []
    const txDate = form.transaction_date ? new Date(form.transaction_date) : new Date()
    return recommendCards(cards, rates, caps, form.category_id, amt, transactions, txDate, overrides, paymentChannel, statementDays, boosts)
  }, [form.category_id, form.amount, form.transaction_date, cards, rates, caps, transactions, overrides, paymentChannel, statementDays, boosts])

  const bestCardId = recs[0]?.card.id ?? ''
  const selectedRec = useMemo(() => recs.find(r => r.card.id === form.card_id) ?? null, [recs, form.card_id])

  const personalAmount = useMemo(() => {
    const amt = parseFloat(form.amount)
    if (!splitOpen || isNaN(amt) || amt <= 0) return null
    if (splitMode === 'even') {
      return splitN != null && splitN >= 2 ? parseFloat((amt / splitN).toFixed(2)) : null
    }
    const custom = parseFloat(splitCustom)
    return (!isNaN(custom) && custom >= 0 && custom <= amt) ? custom : null
  }, [splitOpen, splitMode, splitN, splitCustom, form.amount])

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
    if (k === 'category_id') {
      // Online Shopping is inherently card-not-present, so default its channel to
      // 'online' — this keeps it in the Online Shopping cap rather than a card's
      // contactless cap (e.g. UOB Preferred Platinum defaults to contactless).
      const cat = categories.find(c => c.id === v)
      if (cat?.name === 'Online Shopping') setPaymentChannel('online')
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
    setSplitMode('even')
    setSplitN(null)
    setSplitCustom('')
    setSplitInfoOpen(false)
    setError(null)
  }

  function openAdd(presetCardId?: string) {
    resetModal()
    if (presetCardId) setForm(f => ({ ...f, card_id: presetCardId }))
    setShowModal(true)
  }
  const cashCardId = allCards.find(c => c.card_type === 'debit')?.id

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
      setSplitMode('amount')
      setSplitN(null)
      setSplitCustom(t.personal_amount.toFixed(2))
    } else {
      setSplitOpen(false)
      setSplitMode('even')
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
      ;({ effectiveMpd: engineMpd } = calcMiles(card, rates, caps, form.category_id, amount, transactions, txDate, overrides, paymentChannel, statementDays, boosts))
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
    toast(editingId ? 'Transaction updated' : 'Transaction saved')
    refreshTransactions()
  }

  async function confirmDeleteTransaction() {
    if (!txToDelete) return
    await supabase.from('transactions').delete().eq('id', txToDelete.id)
    setTxToDelete(null)
    toast('Transaction deleted')
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
  useEffect(() => { loadFavourites(); loadUpcoming() }, [])

  // Rolling top-up: keep each recurring rule's occurrences generated up to the
  // horizon as time passes (idempotent — skips dates that already exist).
  useEffect(() => {
    if (!favourites.length || !cards.length) return
    ;(async () => {
      const rules = favourites.filter(f => f.recur_unit != null)
      if (!rules.length) return
      for (const f of rules) await generateForFav(f)
      loadUpcoming(); refreshTransactions()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favourites.length, cards.length])

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
    setSplitMode('even')
    setSplitN(null)
    setSplitCustom('')
    setError(null)
  }

  function favouriteFallbackName() {
    return vendorName.trim() || categories.find(c => c.id === form.category_id)?.name || 'Favourite'
  }

  function openSaveFavourite() {
    if (!form.card_id && !vendorName.trim()) {
      setError('Pick a card or vendor before saving a favourite.')
      return
    }
    setFavNameInput(favouriteFallbackName())
    setFavNameOpen(true)
  }

  // Reset the shared transaction-form fields (used by both logging and the recurring editor).
  function resetFormFields() {
    setForm(EMPTY_FORM)
    setVendorName(''); setSelectedVendor(null)
    setMcc(''); setMccEditing(false); setMccInputVal('')
    setPaymentChannel(null)
    setMpdOverrideActive(false); setManualMpd(''); setOverrideNote('')
  }

  // Standalone recurring editor — new blank rule (uses the shared form fields).
  function openNewRecurring() {
    setRecurringOpen(false)
    setEditingFavId(null)
    resetFormFields()
    setForm(f => ({ ...EMPTY_FORM, card_id: cards[0]?.id ?? '' }))
    setRecName('')
    setRecurUnit('month'); setRecurInterval('1'); setRecurStart(todayStr)
    setRecurEndMode('never'); setRecurEndDate(''); setRecurCount('12')
    setError(null)
    setRecurEditorOpen(true)
  }

  // Standalone recurring editor — edit an existing rule (prefills the shared form).
  function openEditRule(f: TransactionFavourite) {
    setRecurringOpen(false)
    setEditingFavId(f.id)
    resetFormFields()
    setForm({ ...EMPTY_FORM, card_id: f.card_id ?? '', category_id: f.category_id ?? '', amount: f.amount != null ? String(f.amount) : '', description: f.description ?? '' })
    setVendorName(f.vendor_name ?? ''); setSelectedVendor(null)
    setMcc(f.mcc ?? '')
    setPaymentChannel(f.payment_channel)
    setRecName(f.label)
    setRecurUnit((f.recur_unit as RecurUnit) ?? 'month')
    setRecurInterval(String(f.recur_interval || 1))
    setRecurStart(f.start_date ?? todayStr)
    setRecurEndMode(f.end_date ? 'date' : f.max_occurrences != null ? 'count' : 'never')
    setRecurEndDate(f.end_date ?? '')
    setRecurCount(String(f.max_occurrences ?? 12))
    setError(null)
    setRecurEditorOpen(true)
  }

  // Compute the earn fields for a generated occurrence, mirroring handleSave.
  function computeEarn(card: typeof cards[number], categoryId: string, amount: number, dateStr: string, channel: typeof paymentChannel) {
    if (card.card_type === 'cashback') {
      const override = cashbackRates.find(r => r.card_id === card.id && r.category_id === categoryId)
      const rate = override?.cashback_rate ?? card.cashback_rate ?? 0
      return { computed_mpd: null, manual_mpd: null, override_note: null, effective_mpd: null, miles_earned: null, cashback_earned: parseFloat((amount * rate).toFixed(4)) }
    }
    if (card.card_type === 'miles') {
      const { effectiveMpd } = calcMiles(card, rates, caps, categoryId, amount, transactions, new Date(dateStr), overrides, channel, statementDays, boosts)
      return { computed_mpd: parseFloat(effectiveMpd.toFixed(4)), manual_mpd: null, override_note: null, effective_mpd: parseFloat(effectiveMpd.toFixed(4)), miles_earned: Math.round(amount * effectiveMpd), cashback_earned: null }
    }
    return { computed_mpd: null, manual_mpd: null, override_note: null, effective_mpd: null, miles_earned: null, cashback_earned: null }
  }

  // Create the rule's upcoming occurrences (skipping any that already exist).
  async function generateForFav(fav: TransactionFavourite) {
    if (!fav.recur_unit || !fav.card_id || !fav.category_id || fav.amount == null) return
    const card = cards.find(c => c.id === fav.card_id) ?? allCards.find(c => c.id === fav.card_id)
    if (!card) return
    const horizonStr = addUnit(todayStr, 'year', 1)
    const occ = futureOccurrences(fav, todayStr, horizonStr)
    if (!occ.length) return
    const { data: existing } = await supabase.from('transactions').select('transaction_date').eq('recurring_id', fav.id)
    const have = new Set((existing ?? []).map((r: { transaction_date: string }) => r.transaction_date))
    const rows = occ.filter(d => !have.has(d)).map(d => ({
      user_id: user!.id,
      card_id: fav.card_id, category_id: fav.category_id,
      amount: fav.amount, description: fav.description, vendor_name: fav.vendor_name,
      mcc: fav.mcc, payment_channel: fav.payment_channel, transaction_date: d,
      ...computeEarn(card, fav.category_id!, fav.amount!, d, fav.payment_channel),
      personal_amount: null, reconciled: false, recurring_id: fav.id,
    }))
    if (rows.length) await supabase.from('transactions').insert(rows)
  }

  async function loadUpcoming() {
    if (!user) return
    const { data } = await supabase.from('transactions').select('*')
      .eq('user_id', user.id).gt('transaction_date', todayStr).order('transaction_date')
    setUpcoming((data as Transaction[]) ?? [])
  }

  // Save a plain (non-recurring) quick-log template from the current form.
  async function submitFavourite() {
    const label = favNameInput.trim() || favouriteFallbackName()
    const { error: e } = await supabase.from('transaction_favourites').insert({
      user_id: user!.id, label,
      card_id: form.card_id || null, category_id: form.category_id || null,
      vendor_name: vendorName.trim() || null, mcc: mcc.trim() || null,
      payment_channel: paymentChannel, amount: form.amount ? parseFloat(form.amount) : null,
      description: form.description || null,
      recur_unit: null, recur_interval: 1, start_date: null, end_date: null, max_occurrences: null,
      recurrence: null, recur_day: null, next_due_date: null,
    })
    if (e) { setError(e.message); return }
    setFavNameOpen(false)
    toast('Favourite saved')
    loadFavourites()
  }

  // Create or edit a recurring rule from the standalone editor; (re)generate occurrences.
  async function submitRecurring() {
    const amt = parseFloat(form.amount)
    if (!form.card_id || !form.category_id || isNaN(amt) || amt <= 0) {
      setError('Card, category, and a valid amount are required.'); return
    }
    const label = recName.trim() || vendorName.trim() || categories.find(c => c.id === form.category_id)?.name || 'Recurring'
    const fields = {
      label, card_id: form.card_id, category_id: form.category_id,
      vendor_name: vendorName.trim() || null, mcc: mcc.trim() || null,
      payment_channel: paymentChannel, amount: amt, description: form.description || null,
      recur_unit: recurUnit, recur_interval: Math.max(1, parseInt(recurInterval) || 1),
      start_date: recurStart || todayStr,
      end_date: recurEndMode === 'date' ? (recurEndDate || null) : null,
      max_occurrences: recurEndMode === 'count' ? Math.max(1, parseInt(recurCount) || 1) : null,
      recurrence: null as null, recur_day: null as number | null, next_due_date: null as string | null,
    }
    if (editingFavId) {
      const { data, error: e } = await supabase.from('transaction_favourites').update(fields).eq('id', editingFavId).select().single()
      if (e) { setError(e.message); return }
      await supabase.from('transactions').delete().eq('recurring_id', editingFavId).gt('transaction_date', todayStr)
      await generateForFav(data as TransactionFavourite)
      toast('Recurring updated · future occurrences regenerated')
    } else {
      const { data, error: e } = await supabase.from('transaction_favourites').insert({ user_id: user!.id, ...fields }).select().single()
      if (e) { setError(e.message); return }
      await generateForFav(data as TransactionFavourite)
      toast('Recurring created')
    }
    setRecurEditorOpen(false)
    setEditingFavId(null)
    loadFavourites(); loadUpcoming(); refreshTransactions()
  }

  // All recurring rules
  const recurringFavs = favourites
    .filter(f => f.recur_unit != null)
    .sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''))

  function fmtDate(s: string) {
    return new Date(s + 'T00:00:00').toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  function fmtMonthYear(mk: string) {
    return new Date(mk + '-01T00:00:00').toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
  }

  // Delete a rule and its upcoming (future-dated) occurrences; past ones are kept.
  async function deleteRuleAndFuture(favId: string) {
    await supabase.from('transactions').delete().eq('recurring_id', favId).gt('transaction_date', todayStr)
    await supabase.from('transaction_favourites').delete().eq('id', favId)
    loadFavourites(); loadUpcoming(); refreshTransactions()
  }

  async function confirmDeleteFavourite() {
    if (!favToDelete) return
    if (favToDelete.recur_unit) {
      await deleteRuleAndFuture(favToDelete.id)   // also removes upcoming occurrences
    } else {
      await supabase.from('transaction_favourites').delete().eq('id', favToDelete.id)
      setFavourites(prev => prev.filter(x => x.id !== favToDelete.id))
    }
    setFavToDelete(null)
    toast('Removed')
  }

  // Active transaction pool — date range (from Supabase) when set, else year (AppContext / prev-year fetch).
  const txPool = rangeActive ? rangePool : (filterYear === nowYear ? transactions : prevYearTxns)

  // Base set (excludes the reconcile-status filter so the reconciliation panel reflects the whole set).
  const baseFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const monthPrefix = !rangeActive && filterMonthNum ? `${filterYear}-${filterMonthNum}` : null
    return txPool.filter(t => {
      if (rangeActive) {
        if (dateFrom && t.transaction_date < dateFrom) return false
        if (dateTo   && t.transaction_date > dateTo)   return false
      } else if (monthPrefix && !t.transaction_date.startsWith(monthPrefix)) return false
      if (filterCat  && t.category_id !== filterCat)  return false
      if (filterCard && t.card_id     !== filterCard)  return false
      if (q && !t.vendor_name?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false
      return true
    })
  }, [txPool, rangeActive, dateFrom, dateTo, filterYear, filterMonthNum, filterCat, filterCard, searchQuery])

  // Displayed list: apply the reconcile-status filter and sort.
  const filtered = useMemo(() => {
    const result = baseFiltered.filter(t => {
      if (reconcileFilter === 'reconciled'   && !isReconciled(t)) return false
      if (reconcileFilter === 'unreconciled' &&  isReconciled(t)) return false
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseFiltered, reconcileFilter, reconOverrides, sortBy, sortDir])

  // Split future-dated (upcoming) from the main list so it isn't cluttered — but
  // when a specific period (month or date range) is selected, show the whole
  // window inline (past + future) so the totals include future-dated rows in it.
  const periodFilterActive = !!filterMonthNum || rangeActive
  const pastFiltered = useMemo(
    () => (periodFilterActive ? filtered : filtered.filter(t => t.transaction_date <= todayStr)),
    [filtered, todayStr, periodFilterActive]
  )
  const upcomingForCard = useMemo(
    () => (filterCard ? upcoming.filter(t => t.card_id === filterCard) : upcoming),
    [upcoming, filterCard]
  )
  // Apply the range window (default next 1 month) on top of the card filter.
  const upcomingShown = useMemo(() => {
    if (upcomingRange === 'all') return upcomingForCard
    const months = upcomingRange === '1m' ? 1 : upcomingRange === '3m' ? 3 : 6
    const end = addUnit(todayStr, 'month', months)
    return upcomingForCard.filter(t => t.transaction_date <= end)
  }, [upcomingForCard, upcomingRange, todayStr])
  const upcomingTotal = upcomingShown.reduce((s, t) => s + t.amount, 0)
  // Mix: collapse recurring occurrences into one line per rule; group one-offs by month.
  const upcomingRecurGroups = useMemo(() => {
    const m = new Map<string, { fav: TransactionFavourite | undefined; txns: Transaction[] }>()
    for (const t of upcomingShown) {
      if (!t.recurring_id) continue
      const g = m.get(t.recurring_id) ?? { fav: favourites.find(f => f.id === t.recurring_id), txns: [] }
      g.txns.push(t); m.set(t.recurring_id, g)
    }
    return [...m.values()].sort((a, z) => (a.txns[0]?.transaction_date ?? '').localeCompare(z.txns[0]?.transaction_date ?? ''))
  }, [upcomingShown, favourites])
  const upcomingOneOffMonths = useMemo(() => {
    const m = new Map<string, Transaction[]>()
    for (const t of upcomingShown) {
      if (t.recurring_id) continue
      const mk = t.transaction_date.slice(0, 7)
      const arr = m.get(mk) ?? []; arr.push(t); m.set(mk, arr)
    }
    return [...m.entries()].sort((a, z) => a[0].localeCompare(z[0]))
  }, [upcomingShown])
  const totalMiles = pastFiltered.reduce((s, t) => s + (t.miles_earned ?? 0), 0)
  const totalSpent = pastFiltered.reduce((s, t) => s + t.amount, 0)
  const totalCashback = pastFiltered.reduce((s, t) => s + (t.cashback_earned ?? 0), 0)
  const periodLabel = rangeActive
    ? `${dateFrom ? fmtDate(dateFrom) : 'start'} → ${dateTo ? fmtDate(dateTo) : 'now'}`
    : filterMonthNum
      ? `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(filterMonthNum) - 1]} ${filterYear}`
      : `${filterYear} · all months`

  // Reconciliation summary over the base set (whole statement)
  const reconCount   = baseFiltered.filter(isReconciled).length
  const reconSum     = baseFiltered.filter(isReconciled).reduce((s, t) => s + t.amount, 0)
  const baseTotal    = baseFiltered.reduce((s, t) => s + t.amount, 0)
  const unreconSum   = baseTotal - reconSum
  const stmtParsed   = parseFloat(statementTotal)
  const stmtDiff     = !isNaN(stmtParsed) ? baseTotal - stmtParsed : null

  async function toggleReconciled(t: Transaction) {
    const next = !isReconciled(t)
    setReconOverrides(prev => ({ ...prev, [t.id]: next }))
    await supabase.from('transactions').update({ reconciled: next }).eq('id', t.id)
  }

  async function setReconciledForVisible(value: boolean) {
    const ids = filtered.map(t => t.id)
    if (ids.length === 0) return
    setReconOverrides(prev => { const n = { ...prev }; ids.forEach(id => { n[id] = value }); return n })
    await supabase.from('transactions').update({ reconciled: value }).in('id', ids)
    toast(value ? 'Marked reconciled' : 'Cleared')
  }

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

  // Approximate MCC bonus-eligibility for the selected card (when an MCC is keyed in).
  const mccEligStatus = useMemo(() => {
    if (mcc.length !== 4 || !form.card_id) return null
    const card = cards.find(c => c.id === form.card_id) ?? allCards.find(c => c.id === form.card_id)
    if (!card) return null
    return resolveMccEligibility(card, mcc, cardMccEligibility, paymentChannel)
  }, [mcc, form.card_id, cards, allCards, cardMccEligibility, paymentChannel])
  const mccRewardNoun = useMemo(() => {
    const card = cards.find(c => c.id === form.card_id) ?? allCards.find(c => c.id === form.card_id)
    return card?.card_type === 'cashback' ? 'cashback' : 'bonus'
  }, [form.card_id, cards, allCards])

  const mccSuggestions = useMemo(() => {
    if (!mccEditing || /^\d*$/.test(mccInputVal) || mccInputVal.length < 2) return []
    const q = mccInputVal.toLowerCase()
    return mccCatalogue.filter(m => m.description.toLowerCase().includes(q)).slice(0, 8)
  }, [mccEditing, mccInputVal, mccCatalogue])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={() => setRecurringOpen(true)} className="btn-secondary text-xs">
            <Repeat size={13} />
            <span className="hidden sm:inline">Recurring</span>
            {recurringFavs.length > 0 && (
              <span className="ml-1 bg-indigo-100 text-indigo-700 text-[10px] font-semibold px-1.5 rounded-full">
                {recurringFavs.length}
              </span>
            )}
          </button>
          {filtered.length > 0 && (
            <button onClick={handleExport} className="btn-secondary text-xs">
              <Download size={13} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
          {cashCardId && (
            <button onClick={() => openAdd(cashCardId)} className="btn-secondary text-xs" title="Log a cash / debit transaction">
              <Wallet size={13} />
              <span className="hidden sm:inline">Cash</span>
            </button>
          )}
          <button onClick={() => openAdd()} className="btn-primary">
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
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
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
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        {loadingYear && <span className="text-xs text-gray-500 self-center">Loading…</span>}

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
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
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
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search vendor or notes…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input pl-7 text-sm w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600">
              <X size={12} />
            </button>
          )}
        </div>

      </div>

      {/* Date range (overrides year/month when set) */}
      <div className="card px-4 py-2.5 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-gray-500">Date range</span>
        <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From" clearable max={dateTo || undefined} />
        <span className="text-gray-400">→</span>
        <DatePicker value={dateTo} onChange={setDateTo} placeholder="To" clearable min={dateFrom || undefined} />
        {rangeActive && (
          <>
            <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-xs text-gray-500 hover:text-gray-700 underline">Clear range</button>
            <span className="text-xs text-indigo-500">· overriding year/month</span>
          </>
        )}
      </div>

      {/* Totals — reflect the active filters (incl. future-dated within the period) */}
      <div>
        <p className="text-xs text-gray-500 mb-2">{periodLabel} · {pastFiltered.length} transaction{pastFiltered.length === 1 ? '' : 's'}</p>
        <div className={`grid gap-3 ${totalCashback > 0 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
          <div className="card p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0"><Receipt size={18} className="text-sky-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Spent</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight truncate">S${Math.round(totalSpent).toLocaleString('en-SG')}</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0"><TrendingUp size={18} className="text-indigo-600" /></div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Miles</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight truncate">+{Math.round(totalMiles).toLocaleString()}</p>
            </div>
          </div>
          {totalCashback > 0 && (
            <div className="card p-4 flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0"><Percent size={18} className="text-emerald-600" /></div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Cashback</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 leading-tight truncate">S${totalCashback.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reconciliation bar */}
      {baseFiltered.length > 0 && (
        <div className="card px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="font-medium text-gray-700 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-500" /> Reconcile
          </span>
          <div className="flex gap-1.5">
            {(['all', 'unreconciled', 'reconciled'] as const).map(f => (
              <button
                key={f}
                onClick={() => setReconcileFilter(f)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize transition-colors ${
                  reconcileFilter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
          <span className="text-gray-500">
            {reconCount}/{baseFiltered.length} reconciled · <span className="text-gray-600 font-medium">S${unreconSum.toFixed(2)}</span> left
          </span>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Statement total</label>
            <span className="text-gray-400 text-xs">S$</span>
            <input
              type="number" min="0" step="0.01"
              value={statementTotal}
              onChange={e => setStatementTotal(e.target.value)}
              placeholder="0.00"
              className="input w-24 text-sm py-1"
            />
            {stmtDiff != null && (
              Math.abs(stmtDiff) < 0.005
                ? <span className="text-emerald-600 text-xs font-medium">✓ matches logged</span>
                : <span className="text-amber-600 text-xs font-medium">
                    ⚠ S${Math.abs(stmtDiff).toFixed(2)} {stmtDiff > 0 ? 'more logged than statement' : 'more on statement than logged'}
                  </span>
            )}
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setReconciledForVisible(true)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              Mark all visible
            </button>
            <span className="text-gray-300">·</span>
            <button onClick={() => setReconciledForVisible(false)} className="text-xs text-gray-500 hover:text-gray-700">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Upcoming (future-dated) — collapsible so the log isn't cluttered.
          Hidden when a month is selected, since that month shows future inline. */}
      {!periodFilterActive && upcomingForCard.length > 0 && (
        <div className="card overflow-hidden">
          <button
            onClick={() => setUpcomingCollapsed(v => { const n = !v; localStorage.setItem('txnUpcomingCollapsed', n ? '1' : '0'); return n })}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
          >
            <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Repeat size={14} className="text-indigo-500" /> Upcoming
              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-semibold px-1.5 rounded-full">{upcomingForCard.length}</span>
            </span>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${upcomingCollapsed ? '-rotate-90' : ''}`} />
          </button>
          {!upcomingCollapsed && (
            <div className="border-t border-gray-100">
              {/* Range presets + summary */}
              <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
                <span className="text-xs text-gray-500">Next</span>
                {(['1m', '3m', '6m', 'all'] as const).map(r => (
                  <button key={r}
                    onClick={() => { setUpcomingRange(r); localStorage.setItem('txnUpcomingRange', r) }}
                    className={`text-xs px-2 py-1 rounded ${upcomingRange === r ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {r === 'all' ? 'All' : r === '1m' ? '1 month' : r === '3m' ? '3 months' : '6 months'}
                  </button>
                ))}
                <span className="ml-auto text-xs text-gray-500">{upcomingShown.length} · S${upcomingTotal.toFixed(2)}</span>
              </div>
              {upcomingShown.length === 0 ? (
                <p className="px-4 py-4 text-sm text-gray-500 text-center border-t border-gray-50">
                  Nothing in this range — {upcomingForCard.length} further out. Try a wider range.
                </p>
              ) : (
                <div>
                  {/* Recurring — one line per rule */}
                  {upcomingRecurGroups.length > 0 && (
                    <div className="divide-y divide-gray-50 border-t border-gray-50">
                      <p className="px-4 pt-2.5 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Recurring</p>
                      {upcomingRecurGroups.map(g => {
                        const t0 = g.txns[0]
                        const cat = categories.find(c => c.id === t0.category_id)
                        return (
                          <div key={g.fav?.id ?? t0.recurring_id!} className="group flex items-center gap-2 px-4 py-2.5 text-sm">
                            <span className="text-lg leading-none shrink-0">{cat?.icon ?? '🔁'}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-gray-800 truncate flex items-center gap-1.5">
                                {g.fav?.label || t0.vendor_name || 'Recurring'}
                                <Repeat size={11} className="text-indigo-400 shrink-0" />
                              </p>
                              <p className="text-xs text-gray-400 truncate">next {fmtDate(t0.transaction_date)} · ×{g.txns.length}</p>
                            </div>
                            <div className="text-right shrink-0 leading-tight">
                              <p className="text-gray-700">S${t0.amount.toFixed(2)}</p>
                              {t0.miles_earned != null && <p className="text-xs text-indigo-600">+{Math.round(t0.miles_earned).toLocaleString()}</p>}
                            </div>
                            {g.fav && (
                              <button onClick={() => openEditRule(g.fav!)} title="Edit rule"
                                className="text-gray-300 hover:text-indigo-500 p-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"><Pencil size={13} /></button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* One-off future items, grouped by month */}
                  {upcomingOneOffMonths.map(([mk, txns]) => (
                    <div key={mk} className="divide-y divide-gray-50 border-t border-gray-50">
                      <p className="px-4 pt-2.5 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{fmtMonthYear(mk)}</p>
                      {txns.map(t => {
                        const card = cards.find(c => c.id === t.card_id) ?? allCards.find(c => c.id === t.card_id)
                        const cat = categories.find(c => c.id === t.category_id)
                        return (
                          <div key={t.id} className="group flex items-center gap-2 px-4 py-2 text-sm">
                            <span className="text-lg leading-none shrink-0">{cat?.icon ?? '💳'}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-gray-800 truncate">{t.vendor_name || t.description || cat?.name || 'Transaction'}</p>
                              <p className="text-xs text-gray-400 truncate">
                                {fmtDate(t.transaction_date)}
                                {card && <> · {card.card_type === 'debit' ? card.name : `${card.bank} ${card.name}`}</>}
                              </p>
                            </div>
                            <div className="text-right shrink-0 leading-tight">
                              <p className="text-gray-700">S${t.amount.toFixed(2)}</p>
                              {t.miles_earned != null && <p className="text-xs text-indigo-600">+{Math.round(t.miles_earned).toLocaleString()}</p>}
                            </div>
                            <div className="flex items-center shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openEdit(t)} className="text-gray-300 hover:text-indigo-500 p-1" title="Edit"><Pencil size={13} /></button>
                              <button onClick={() => setTxToDelete(t)} className="text-gray-300 hover:text-red-500 p-1" title="Delete"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {pastFiltered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500 text-sm">No transactions found.</p>
            <button
              onClick={() => openAdd()}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              <Plus size={15} /> Log a transaction
            </button>
          </div>
        ) : (
          <>
            {/* ── Mobile: card list (hidden on sm+) ── */}
            <div className="sm:hidden divide-y divide-gray-100">
              {pastFiltered.map(t => {
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
                        <span className="text-gray-500"> · {t.transaction_date}</span>
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
                      <span className="text-xs text-gray-500">
                        {card ? (card.bank && card.bank !== 'Cash' ? `${card.bank} ${card.name}` : card.name) : ''}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {nomMpd != null && (
                          <span className="text-xs text-gray-500 mr-1 flex items-center gap-0.5">
                            {isManual && <Pencil size={9} className="text-amber-400" />}
                            {nomMpd} mpd
                          </span>
                        )}
                        <button
                          onClick={() => toggleReconciled(t)}
                          className={`transition-colors p-1 rounded ${isReconciled(t) ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-400'}`}
                          title={isReconciled(t) ? 'Reconciled' : 'Mark reconciled'}
                        >
                          {isReconciled(t) ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                        </button>
                        <button
                          onClick={() => openEdit(t)}
                          className="text-gray-300 hover:text-indigo-500 transition-colors p-1 rounded"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setTxToDelete(t)}
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
                    <th className="px-3 py-3" title="Reconciled" />
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
                  {pastFiltered.map(t => {
                    const card = cards.find(c => c.id === t.card_id) ?? allCards.find(c => c.id === t.card_id)
                    const cat  = categories.find(c => c.id === t.category_id)
                    const isManual = t.manual_mpd != null
                    const primaryLabel = t.vendor_name || t.description || cat?.name || '—'
                    const notesLine = t.vendor_name && t.description ? t.description : null
                    return (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="pl-4 pr-1 py-3">
                          <button
                            onClick={() => toggleReconciled(t)}
                            title={isReconciled(t) ? 'Reconciled — click to unmark' : 'Mark reconciled against statement'}
                            className={isReconciled(t) ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-400'}
                          >
                            {isReconciled(t) ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{t.transaction_date}</td>
                        <td className="px-4 py-3 text-gray-800">
                          <span className="block">{primaryLabel}</span>
                          {notesLine && (
                            <span className="block text-xs text-gray-500 mt-0.5">{notesLine}</span>
                          )}
                          {t.mcc && (
                            <span className="block text-xs text-gray-500 font-mono mt-0.5">
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
                                <span className="text-[11px] text-indigo-500 bg-indigo-50 px-1 rounded">tap</span>
                              )}
                              {t.payment_channel === 'online' && (
                                <span className="text-[11px] text-sky-500 bg-sky-50 px-1 rounded">online</span>
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
                        <td className="px-4 py-3 text-right hidden md:table-cell text-gray-500 text-xs">
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
                              onClick={() => setTxToDelete(t)}
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
                      className="text-xs pl-2.5 pr-1.5 py-1 hover:bg-amber-100 transition-colors flex items-center gap-1"
                    >
                      {f.recurrence === 'monthly' && <Repeat size={10} className="text-indigo-500 shrink-0" />}
                      {f.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFavToDelete(f)}
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
            <DatePicker value={form.transaction_date} onChange={v => setField('transaction_date', v)} className="w-full" />
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
            <label className="label">Notes <span className="text-gray-500 font-normal text-xs">(optional)</span></label>
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
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* MCC — auto-filled by vendor selection, always optional */}
          <div>
            <label className="label">
              MCC{' '}
              <span className="text-gray-500 font-normal text-xs">(optional)</span>
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
                    <span className="text-xs text-gray-500 italic shrink-0">Unknown MCC</span>
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
                  className="text-gray-500 hover:text-indigo-600 transition-colors"
                  title="Edit MCC"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => setMcc('')}
                  className="text-gray-500 hover:text-red-500 transition-colors"
                  title="Remove MCC"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setMccInputVal(''); setMccEditing(true) }}
                className="text-xs text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
              >
                + Add MCC
              </button>
            )}
            {mccEligStatus && (
              <p className={`text-xs mt-1 ${mccEligStatus.state === 'eligible' ? 'text-emerald-600' : mccEligStatus.state === 'ineligible' || mccEligStatus.state === 'reduced' ? 'text-amber-600' : 'text-gray-500'}`}>
                {mccEligStatus.state === 'eligible' && <>✓ Eligible for {mccRewardNoun}{mccEligStatus.label ? ` · ${mccEligStatus.label}` : ''}{mccEligStatus.note ? ` — ${mccEligStatus.note}` : ''}*</>}
                {mccEligStatus.state === 'ineligible' && <>✗ Not eligible for {mccRewardNoun}{mccEligStatus.note ? ` — ${mccEligStatus.note}` : ''}*</>}
                {mccEligStatus.state === 'reduced' && <>◐ Reduced {mccRewardNoun} rate{mccEligStatus.note ? ` · ${mccEligStatus.note}` : ''}{mccEligStatus.label ? ` · ${mccEligStatus.label}` : ''}*</>}
                {mccEligStatus.state === 'nodata' && <>No eligibility data for this card yet*</>}
              </p>
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
                    className="text-xs text-gray-500 hover:text-indigo-500 transition-colors flex items-center gap-1"
                  >
                    <Users size={11} /> Split with group?
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitInfoOpen(p => !p)}
                    className={`transition-colors ${splitInfoOpen ? 'text-indigo-500' : 'text-gray-300 hover:text-gray-500'}`}
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
                    <Users size={12} className="text-gray-500" /> Split with group
                  </span>
                  <button
                    type="button"
                    onClick={() => { setSplitOpen(false); setSplitMode('even'); setSplitN(null); setSplitCustom('') }}
                    className="text-gray-500 hover:text-gray-600"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[2, 3, 4].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => { setSplitMode('even'); setSplitN(n); setSplitCustom('') }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        splitMode === 'even' && splitN === n
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      ÷{n}
                    </button>
                  ))}
                  {/* Custom divisor */}
                  <div
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${
                      splitMode === 'even' && splitN != null && ![2, 3, 4].includes(splitN)
                        ? 'border-indigo-600 text-indigo-700'
                        : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    <span>÷</span>
                    <input
                      type="number" min="2"
                      placeholder="N"
                      value={splitMode === 'even' && splitN != null && ![2, 3, 4].includes(splitN) ? String(splitN) : ''}
                      onChange={e => {
                        const n = parseInt(e.target.value)
                        setSplitMode('even')
                        setSplitN(n >= 2 ? n : null)
                        setSplitCustom('')
                      }}
                      className="w-9 bg-transparent focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSplitMode('amount'); setSplitN(null) }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      splitMode === 'amount'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    Exact $
                  </button>
                </div>
                {splitMode === 'amount' && (
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
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
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
              <span className="text-gray-500 font-normal text-xs ml-1">(affects cap tracking)</span>
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
                    className="text-xs text-gray-500 hover:text-gray-600"
                  >
                    ↺ Reset to computed ({nominalComputedMpd?.toFixed(2)} mpd)
                  </button>
                )}
              </div>

              {!mpdOverrideActive ? (
                <div className="space-y-1">
                  <div className="input bg-gray-50 flex items-center justify-between text-gray-600 cursor-default select-none">
                    <span>{nominalComputedMpd?.toFixed(2)} mpd</span>
                    <span className="text-xs text-gray-500">computed</span>
                  </div>
                  {formCard && earnAmount > 0 && earnAmount !== formAmt && (
                    <p className="text-xs text-gray-500">
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
                <p className="text-xs text-gray-500 mt-1.5 text-right">
                  Miles earned:{' '}
                  <span className="text-indigo-600 font-medium">{previewMiles.toLocaleString()} mi</span>
                </p>
              )}
              {!mpdOverrideActive && selectedRec && <PartialBonusNote amount={formAmt} rec={selectedRec} />}
              {previewCashback != null && (
                <p className="text-xs text-gray-500 mt-1.5 text-right">
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
              onClick={openSaveFavourite}
              className="flex items-center justify-center gap-1.5 w-full text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 py-1.5 rounded-lg transition-colors"
            >
              <Star size={12} /> Save as favourite for quick reuse
            </button>
          )}

          {mccEligStatus && (
            <p className="text-[11px] text-gray-400 pt-1">
              * MCC matching is approximate — please do your own due diligence and verify with your bank if needed.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save Transaction'}
            </button>
          </div>
        </Modal>
      )}

      {recurringOpen && (
        <Modal title="Recurring charges" onClose={() => setRecurringOpen(false)}>
          {recurringFavs.length === 0 ? (
            <div className="py-8 text-center space-y-3">
              <Repeat size={28} className="text-gray-300 mx-auto" />
              <p className="text-sm text-gray-500">No recurring charges yet.</p>
              <button onClick={openNewRecurring} className="btn-primary text-sm inline-flex items-center gap-1.5">
                <Plus size={14} /> Create your first recurring charge
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 pr-2">
                  Each rule auto-creates its upcoming transactions (they count toward caps). Editing regenerates future occurrences.
                </p>
                <button onClick={openNewRecurring} className="btn-primary text-xs shrink-0 inline-flex items-center gap-1">
                  <Plus size={13} /> New
                </button>
              </div>
              {recurringFavs.map(f => {
                const card = cards.find(c => c.id === f.card_id) ?? allCards.find(c => c.id === f.card_id)
                const cat = categories.find(c => c.id === f.category_id)
                const nextCharge = futureOccurrences(f, todayStr, addUnit(todayStr, 'year', 1))[0]
                return (
                  <div key={f.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <span className="text-lg leading-none">{cat?.icon ?? '🔁'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{f.label}</p>
                      <p className="text-xs text-gray-500">
                        {recurLabel(f)}
                        {nextCharge && <> · next {fmtDate(nextCharge)}</>}
                        {card && <> · {card.card_type === 'debit' ? card.name : `${card.bank} ${card.name}`}</>}
                        {f.amount != null ? ` · S$${f.amount.toFixed(2)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEditRule(f)}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { setRecurringOpen(false); setFavToDelete(f) }}
                        title="Delete recurring"
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Modal>
      )}

      {favToDelete && (
        <Modal title="Remove favourite" onClose={() => setFavToDelete(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Remove <span className="font-semibold text-gray-900">"{favToDelete.label}"</span>?
              {favToDelete.recur_unit
                ? ' Its upcoming (future-dated) transactions will be deleted; already-logged ones are kept.'
                : " This won't affect any transactions you've already logged."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setFavToDelete(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={confirmDeleteFavourite}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg py-2 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </Modal>
      )}

      {favNameOpen && (
        <Modal title="Save as favourite" onClose={() => setFavNameOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                autoFocus
                value={favNameInput}
                onChange={e => setFavNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitFavourite() }}
                placeholder="e.g. Netflix"
                className="input"
              />
              <p className="text-xs text-gray-500 mt-1">Saves the card, category, vendor and payment method for quick reuse. For repeating charges, use <span className="font-medium">Recurring</span> in the toolbar.</p>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setFavNameOpen(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={submitFavourite} className="btn-primary flex-1">Save favourite</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Standalone recurring-rule editor */}
      {recurEditorOpen && (
        <Modal title={editingFavId ? 'Edit recurring charge' : 'New recurring charge'} onClose={() => { setRecurEditorOpen(false); setEditingFavId(null) }}>
          <div className="space-y-3">
            <div>
              <label className="label">Name</label>
              <input autoFocus value={recName} onChange={e => setRecName(e.target.value)} placeholder="e.g. Netflix" className="input" />
            </div>
            <div>
              <label className="label">Vendor <span className="text-gray-500 font-normal text-xs">(optional)</span></label>
              <VendorInput
                vendorName={vendorName}
                isVendorSelected={selectedVendor !== null}
                vendors={vendorCatalogue}
                onNameChange={name => { setVendorName(name); setSelectedVendor(null) }}
                onSelect={handleVendorSelect}
                onClear={handleVendorClear}
              />
            </div>
            <div>
              <label className="label">Notes <span className="text-gray-500 font-normal text-xs">(optional)</span></label>
              <input value={form.description} onChange={e => setField('description', e.target.value)} placeholder="e.g. Family plan" className="input" />
            </div>
            <div>
              <label className="label">Category</label>
              <select value={form.category_id} onChange={e => setField('category_id', e.target.value)} className="input">
                <option value="">Select category…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">MCC <span className="text-gray-500 font-normal text-xs">(optional)</span></label>
              <input value={mcc} onChange={e => setMcc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="e.g. 5814" inputMode="numeric" className="input" />
              {mccDescription && <p className="text-xs text-gray-500 mt-0.5">{mccDescription}</p>}
              {mccEligStatus && (
                <p className={`text-xs mt-0.5 ${mccEligStatus.state === 'eligible' ? 'text-emerald-600' : mccEligStatus.state === 'ineligible' || mccEligStatus.state === 'reduced' ? 'text-amber-600' : 'text-gray-500'}`}>
                  {mccEligStatus.state === 'eligible' && <>✓ Eligible for {mccRewardNoun}{mccEligStatus.label ? ` · ${mccEligStatus.label}` : ''}{mccEligStatus.note ? ` — ${mccEligStatus.note}` : ''}*</>}
                  {mccEligStatus.state === 'ineligible' && <>✗ Not eligible for {mccRewardNoun}{mccEligStatus.note ? ` — ${mccEligStatus.note}` : ''}*</>}
                  {mccEligStatus.state === 'reduced' && <>◐ Reduced {mccRewardNoun} rate{mccEligStatus.note ? ` · ${mccEligStatus.note}` : ''}{mccEligStatus.label ? ` · ${mccEligStatus.label}` : ''}*</>}
                {mccEligStatus.state === 'nodata' && <>No eligibility data for this card yet*</>}
                </p>
              )}
            </div>
            <div>
              <label className="label">Amount (S$)</label>
              <input type="number" step="0.01" value={form.amount} onChange={e => setField('amount', e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Card Used</label>
              <div className="relative">
                <select value={form.card_id} onChange={e => setField('card_id', e.target.value)} className="input appearance-none pr-8">
                  <option value="">Select card…</option>
                  {cards.map(c => <option key={c.id} value={c.id}>{c.bank} {c.name}</option>)}
                  {allCards.filter(c => c.card_type === 'debit' && !selectedCardIds.has(c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="label">Payment method</label>
              <div className="grid grid-cols-3 gap-2">
                {(['chip', 'contactless', 'online'] as const).map(mode => (
                  <button key={mode} type="button"
                    onClick={() => setPaymentChannel(paymentChannel === mode ? null : mode)}
                    className={`py-1.5 text-xs rounded-lg border transition-colors ${paymentChannel === mode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}>
                    {mode === 'chip' ? 'Chip / Swipe' : mode === 'contactless' ? 'Tap to pay' : 'Online'}
                  </button>
                ))}
              </div>
            </div>
            {mccEligStatus && (
              <p className="text-[11px] text-gray-400">* MCC matching is approximate — verify with your bank if needed.</p>
            )}

            {/* Schedule */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className="text-xs text-gray-500">Repeat every</span>
                <input type="number" min={1} value={recurInterval} onChange={e => setRecurInterval(e.target.value)} className="input text-sm py-1 w-16" />
                <select value={recurUnit} onChange={e => setRecurUnit(e.target.value as RecurUnit)} className="input text-sm py-1 w-auto">
                  {RECUR_UNITS.map(u => <option key={u} value={u}>{u}{(parseInt(recurInterval) || 1) > 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <span className="text-xs text-gray-500 shrink-0">Starting</span>
                <DatePicker value={recurStart} onChange={setRecurStart} />
              </div>
              <div className="space-y-1.5">
                <span className="text-xs text-gray-500">Ends</span>
                <div className="flex items-center gap-3 flex-wrap text-sm">
                  <label className="flex items-center gap-1"><input type="radio" checked={recurEndMode === 'never'} onChange={() => setRecurEndMode('never')} className="accent-indigo-600" /> Never</label>
                  <label className="flex items-center gap-1"><input type="radio" checked={recurEndMode === 'date'} onChange={() => setRecurEndMode('date')} className="accent-indigo-600" /> On date</label>
                  <label className="flex items-center gap-1"><input type="radio" checked={recurEndMode === 'count'} onChange={() => setRecurEndMode('count')} className="accent-indigo-600" /> After</label>
                </div>
                {recurEndMode === 'date' && <DatePicker value={recurEndDate} onChange={setRecurEndDate} min={recurStart} />}
                {recurEndMode === 'count' && (
                  <div className="flex items-center gap-2 text-sm">
                    <input type="number" min={1} value={recurCount} onChange={e => setRecurCount(e.target.value)} className="input text-sm py-1 w-16" />
                    <span className="text-xs text-gray-500">occurrences</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-indigo-600">
                Future transactions are created now (up to ~12 months) and count toward your caps for planning.
              </p>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => { setRecurEditorOpen(false); setEditingFavId(null) }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={submitRecurring} className="btn-primary flex-1">
                {editingFavId ? 'Save changes' : 'Create recurring'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {txToDelete && (
        <Modal title="Delete transaction" onClose={() => setTxToDelete(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Delete this transaction
              {txToDelete.vendor_name ? <> at <span className="font-semibold text-gray-900">{txToDelete.vendor_name}</span></> : null}
              {' '}for <span className="font-semibold text-gray-900">S${txToDelete.amount.toFixed(2)}</span>? This can't be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setTxToDelete(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={confirmDeleteTransaction}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg py-2 transition-colors"
              >
                Delete
              </button>
            </div>
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
