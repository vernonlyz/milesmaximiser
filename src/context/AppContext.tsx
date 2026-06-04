import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { Category, CreditCard, CardRate, SpendingCap, Transaction } from '../lib/types'

interface AppContextValue {
  categories: Category[]
  cards: CreditCard[]
  rates: CardRate[]
  caps: SpendingCap[]
  transactions: Transaction[]
  loading: boolean
  error: string | null
  refresh: () => void
  refreshTransactions: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<CreditCard[]>([])
  const [rates, setRates] = useState<CardRate[]>([])
  const [caps, setCaps] = useState<SpendingCap[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStaticData = useCallback(async () => {
    try {
      const [catRes, cardRes, rateRes, capRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('credit_cards').select('*').order('bank').order('name'),
        supabase.from('card_rates').select('*'),
        supabase.from('spending_caps').select('*'),
      ])
      if (catRes.error) throw catRes.error
      if (cardRes.error) throw cardRes.error
      if (rateRes.error) throw rateRes.error
      if (capRes.error) throw capRes.error

      setCategories(catRes.data ?? [])
      setCards(cardRes.data ?? [])
      setRates(rateRes.data ?? [])
      setCaps(capRes.data ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    }
  }, [])

  const loadTransactions = useCallback(async () => {
    // Load transactions from start of current year onwards to cover all cap periods
    const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('transaction_date', yearStart)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setTransactions(data ?? [])
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    await Promise.all([loadStaticData(), loadTransactions()])
    setLoading(false)
  }, [loadStaticData, loadTransactions])

  const refreshTransactions = useCallback(async () => {
    await loadTransactions()
  }, [loadTransactions])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <AppContext.Provider value={{
      categories, cards, rates, caps, transactions,
      loading, error, refresh, refreshTransactions,
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
