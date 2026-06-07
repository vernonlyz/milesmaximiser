export interface Category {
  id: string
  name: string
  icon: string
}

export interface CreditCard {
  id: string
  name: string
  bank: string
  card_network: string
  base_mpd: number
  color: string
  active: boolean
  created_at: string
}

export interface CardRate {
  id: string
  card_id: string
  category_id: string
  mpd: number
  effective_from: string   // ISO date — rate applies from this date onward
}

export interface SpendingCap {
  id: string
  card_id: string
  category_id: string | null  // null = global cap on all spend for this card
  cap_period: 'monthly' | 'quarterly' | 'annual' | 'per_transaction'
  spend_limit: number | null  // null = cap was REMOVED from effective_from onward
  effective_from: string      // ISO date — cap applies from this date onward
  created_at: string
}

export interface Transaction {
  id: string
  card_id: string | null
  category_id: string | null
  amount: number
  description: string | null
  transaction_date: string
  miles_earned: number | null
  effective_mpd: number | null
  created_at: string
}

export interface TransactionWithDetails extends Transaction {
  card: CreditCard | null
  category: Category | null
}

export interface CardRecommendation {
  card: CreditCard
  bonusMpd: number
  effectiveMpd: number
  milesEarned: number
  capRemaining: number | null
  capAmount: number | null
  capPeriod: string | null
  status: 'optimal' | 'partial' | 'capped' | 'base'
  reason: string
}

export interface CardFormRate {
  category_id: string
  mpd: string
}

export interface CardFormCap {
  category_id: string           // '' = global cap
  cap_period: SpendingCap['cap_period']
  spend_limit: string           // '' = cap removed (will save as NULL)
}

export interface CardFormData {
  name: string
  bank: string
  card_network: string
  base_mpd: string
  color: string
  active: boolean
  effective_from: string        // ISO date — applies to all rate/cap changes in this save
  rates: CardFormRate[]
  caps: CardFormCap[]
}

export interface TransactionFormData {
  card_id: string
  category_id: string
  amount: string
  description: string
  transaction_date: string
}
