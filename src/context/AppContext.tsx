import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { Category, CreditCard, CardRate, SpendingCap, Transaction } from '../lib/types'

interface AppContextValue {
  categories: Category[]
  allCards: CreditCard[]           // every card in the library
  cards: CreditCard[]              // only the user's selected cards (wallet)
  selectedCardIds: Set<string>
  rates: CardRate[]                // all library rates (filter by card_id as needed)
  caps: SpendingCap[]              // all library caps
  transactions: Transaction[]
  loading: boolean
  error: string | null
  refresh: () => void
  refreshTransactions: () => void
  addCardSelection: (cardId: string) => Promise<void>
  removeCardSelection: (cardId: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  const [categories, setCategories]           = useState<Category[]>([])
  const [allCards, setAllCards]               = useState<CreditCard[]>([])
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set())
  const [rates, setRates]                     = useState<CardRate[]>([])
  const [caps, setCaps]                       = useState<SpendingCap[]>([])
  const [transactions, setTransactions]       = useState<Transaction[]>([])
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState<string | null>(null)

  const loadLibrary = useCallback(async () => {
    const [catRes, cardRes, rateRes, capRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('card_library').select('*').order('bank').order('name'),
      supabase.from('library_rates').select('*'),
      supabase.from('library_caps').select('*'),
    ])
    if (catRes.error)  throw catRes.error
    if (cardRes.error) throw cardRes.error
    if (rateRes.error) throw rateRes.error
    if (capRes.error)  throw capRes.error
    setCategories(catRes.data ?? [])
    setAllCards(cardRes.data ?? [])
    setRates(rateRes.data ?? [])
    setCaps(capRes.data ?? [])
  }, [])

  const loadSelections = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('user_card_selections')
      .select('card_id')
      .eq('user_id', user.id)
    if (error) throw error
    setSelectedCardIds(new Set(data?.map(s => s.card_id) ?? []))
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
  }

  useEffect(() => {
    if (user) refresh()
    else {
      setCategories([])
      setAllCards([])
      setSelectedCardIds(new Set())
      setRates([])
      setCaps([])
      setTransactions([])
      setLoading(false)
    }
  }, [user?.id])

  // Derive wallet cards from library + selections
  const cards = allCards.filter(c => selectedCardIds.has(c.id))

  return (
    <AppContext.Provider value={{
      categories, allCards, cards, selectedCardIds,
      rates, caps, transactions,
      loading, error,
      refresh, refreshTransactions,
      addCardSelection, removeCardSelection,
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
