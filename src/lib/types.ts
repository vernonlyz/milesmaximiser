export interface Category {
  id: string
  name: string
  icon: string
}

// Library card — admin-managed, shared across all users
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

// Bonus earn rate for a library card — has effective_from for versioning
export interface CardRate {
  id: string
  card_id: string
  category_id: string
  mpd: number
  effective_from: string
}

// Spending cap for a library card — spend_limit null = cap removed
export interface SpendingCap {
  id: string
  card_id: string
  category_id: string | null
  cap_period: 'monthly' | 'quarterly' | 'annual' | 'per_transaction'
  spend_limit: number | null
  effective_from: string
}

// Which library cards a user has in their wallet
export interface UserCardSelection {
  user_id: string
  card_id: string
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

export interface TransactionFormData {
  card_id: string
  category_id: string
  amount: string
  description: string
  transaction_date: string
}
