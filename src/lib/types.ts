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
}

export interface SpendingCap {
  id: string
  card_id: string
  category_id: string | null  // null = global cap on all spend
  cap_period: 'monthly' | 'quarterly' | 'annual' | 'per_transaction'
  spend_limit: number
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

// Result from the recommendation engine for one card
export interface CardRecommendation {
  card: CreditCard
  bonusMpd: number        // advertised mpd for this category (before cap)
  effectiveMpd: number    // actual mpd considering cap usage
  milesEarned: number     // miles that would be earned on this transaction
  capRemaining: number | null  // spend remaining in cap this period (null = no cap)
  capAmount: number | null     // total cap amount
  capPeriod: string | null
  status: 'optimal' | 'partial' | 'capped' | 'base'
  reason: string
}

// Form shapes
export interface CardFormRate {
  category_id: string
  mpd: string
}

export interface CardFormCap {
  category_id: string   // '' = global
  cap_period: SpendingCap['cap_period']
  spend_limit: string
}

export interface CardFormData {
  name: string
  bank: string
  card_network: string
  base_mpd: string
  color: string
  active: boolean
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
