import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { Category, CreditCard, CardRate, SpendingCap, Transaction, SelectableCategory, CategoryOverride, MccEntry, Vendor, CashbackRate } from '../lib/types'
import { isoDate } from '../lib/utils'

interface AppContextValue {
  categories: Category[]
  allCards: CreditCard[]           // every card in the library
  cards: CreditCard[]              // only the user's selected cards (wallet)
  selectedCardIds: Set<string>
  statementDays: Map<string, number>  // cardId → statement closing day (1–28)
  rates: CardRate[]                // all library rates (filter by card_id as needed)
  caps: SpendingCap[]              // all library caps
  selectableCategories: SelectableCategory[]  // valid choices per selectable card
  overrides: CategoryOverride[]    // user's active bonus-category choices
  transactions: Transaction[]
  mccCatalogue: MccEntry[]         // admin-seeded MCC reference data
  vendorCatalogue: Vendor[]        // admin-seeded known SG vendors
  cashbackRates: CashbackRate[]    // per-category cashback rate overrides
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  refreshTransactions: () => Promise<void>
  addCardSelection: (cardId: string) => Promise<void>
  removeCardSelection: (cardId: string) => Promise<void>
  saveOverride: (cardId: string, categoryIds: string[], effectiveFrom?: string) => Promise<void>
  saveStatementDay: (cardId: string, day: number | null) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [categories, setCategories]                   = useState<Category[]>([])
  const [allCards, setAllCards]                       = useState<CreditCard[]>([])
  const [selectedCardIds, setSelectedCardIds]         = useState<Set<string>>(new Set())
  const [statementDays, setStatementDays]             = useState<Map<string, number>>(new Map())
  const [rates, setRates]                             = useState<CardRate[]>([])
  const [caps, setCaps]                               = useState<SpendingCap[]>([])
  const [selectableCategories, setSelectableCategories] = useState<SelectableCategory[]>([])
  const [overrides, setOverrides]                     = useState<CategoryOverride[]>([])
  const [transactions, setTransactions]               = useState<Transaction[]>([])
  const [mccCatalogue, setMccCatalogue]               = useState<MccEntry[]>([])
  const [vendorCatalogue, setVendorCatalogue]         = useState<Vendor[]>([])
  const [cashbackRates, setCashbackRates]             = useState<CashbackRate[]>([])
  const [loading, setLoading]                         = useState(true)
  const [error, setError]                             = useState<string | null>(null)

  const loadLibrary = useCallback(async () => {
    const [catRes, cardRes, rateRes, capRes, selectableRes, mccRes, vendorRes, cbRateRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('card_library').select('*').order('bank').order('name'),
      supabase.from('library_rates').select('*'),
      supabase.from('library_caps').select('*'),
      supabase.from('library_selectable_categories').select('*'),
      supabase.from('mcc_catalogue').select('*').order('code'),
      supabase.from('vendor_catalogue').select('*').eq('active', true).order('name'),
      supabase.from('library_cashback_rates').select('*'),
    ])
    if (catRes.error)       throw catRes.error
    if (cardRes.error)      throw cardRes.error
    if (rateRes.error)      throw rateRes.error
    if (capRes.error)       throw capRes.error
    if (selectableRes.error) throw selectableRes.error
    if (mccRes.error)       throw mccRes.error
    if (vendorRes.error)    throw vendorRes.error
    if (cbRateRes.error)    throw cbRateRes.error
    setCategories(catRes.data ?? [])
    setAllCards(cardRes.data ?? [])
    setRates(rateRes.data ?? [])
    setCaps(capRes.data ?? [])
    setSelectableCategories(selectableRes.data ?? [])
    setMccCatalogue(mccRes.data ?? [])
    setVendorCatalogue(vendorRes.data ?? [])
    setCashbackRates(cbRateRes.data ?? [])
  }, [])

  const loadSelections = useCallback(async () => {
    if (!user) return
    const [selRes, overrideRes] = await Promise.all([
      supabase.from('user_card_selections').select('card_id, statement_day').eq('user_id', user.id),
      supabase.from('user_category_overrides').select('*').eq('user_id', user.id),
    ])
    if (selRes.error)      throw selRes.error
    if (overrideRes.error) throw overrideRes.error
    const sels = selRes.data ?? []
    setSelectedCardIds(new Set(sels.map(s => s.card_id)))
    const days = new Map<string, number>()
    for (const s of sels) {
      if (s.statement_day != null) days.set(s.card_id, s.statement_day)
    }
    setStatementDays(days)
    setOverrides(overrideRes.data ?? [])
  }, [user?.id])

  const loadTransactions = useCallback(async () => {
    if (!user) return
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', yearStart)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    setTransactions(data ?? [])
  }, [user?.id])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadLibrary(), loadSelections(), loadTransactions()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    }
    setLoading(false)
  }, [loadLibrary, loadSelections, loadTransactions])

  const refreshTransactions = useCallback(async () => {
    try { await loadTransactions() } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions')
    }
  }, [loadTransactions])

  async function addCardSelection(cardId: string) {
    if (!user) return
    await supabase.from('user_card_selections').insert({ user_id: user.id, card_id: cardId })
    setSelectedCardIds(prev => new Set([...prev, cardId]))
  }

  async function removeCardSelection(cardId: string) {
    if (!user) return
    await supabase.from('user_card_selections')
      .delete().eq('user_id', user.id).eq('card_id', cardId)
    setSelectedCardIds(prev => { const next = new Set(prev); next.delete(cardId); return next })
    setStatementDays(prev => { const next = new Map(prev); next.delete(cardId); return next })
  }

  async function saveStatementDay(cardId: string, day: number | null) {
    if (!user) return
    await supabase.from('user_card_selections')
      .update({ statement_day: day })
      .eq('user_id', user.id)
      .eq('card_id', cardId)
    setStatementDays(prev => {
      const next = new Map(prev)
      if (day == null) next.delete(cardId)
      else next.set(cardId, day)
      return next
    })
  }

  // Upsert a bonus-category override for a selectable card.
  // Uses effectiveFrom (default today) so history is preserved on future changes.
  async function saveOverride(
    cardId: string,
    categoryIds: string[],
    effectiveFrom: string = isoDate()
  ) {
    if (!user) return
    const { data, error } = await supabase
      .from('user_category_overrides')
      .upsert(
        { user_id: user.id, card_id: cardId, category_ids: categoryIds, effective_from: effectiveFrom },
        { onConflict: 'user_id,card_id,effective_from' }
      )
      .select()
      .single()
    if (error) throw error
    setOverrides(prev => {
      const without = prev.filter(o => !(o.card_id === cardId && o.effective_from === effectiveFrom))
      return [...without, data as CategoryOverride]
    })
  }

  useEffect(() => {
    if (user) refresh()
    else {
      setCategories([])
      setAllCards([])
      setSelectedCardIds(new Set())
      setStatementDays(new Map())
      setRates([])
      setCaps([])
      setSelectableCategories([])
      setOverrides([])
      setTransactions([])
      setMccCatalogue([])
      setVendorCatalogue([])
      setCashbackRates([])
      setLoading(false)
    }
  }, [user?.id])

  // Derive wallet cards from library + selections
  const cards = allCards.filter(c => selectedCardIds.has(c.id))

  return (
    <AppContext.Provider value={{
      categories, allCards, cards, selectedCardIds, statementDays,
      rates, caps, selectableCategories, overrides,
      transactions, mccCatalogue, vendorCatalogue, cashbackRates,
      loading, error,
      refresh, refreshTransactions,
      addCardSelection, removeCardSelection, saveOverride, saveStatementDay,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
