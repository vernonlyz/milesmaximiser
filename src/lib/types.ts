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
  selectable_category: boolean  // true = user picks their bonus category
  max_selectable: number        // how many categories the user may choose (1 or 2)
  mile_validity: string | null  // e.g. "No expiry", "12 months", "24 months"
  remarks: string[] | null      // bullet-point notes shown in the UI
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
  computed_mpd: number | null   // engine-calculated MPD at save time
  manual_mpd: number | null     // user override; null = no override
  override_note: string | null  // reason for override
  effective_mpd: number | null  // COALESCE(manual_mpd, computed_mpd) — final applied value
  miles_earned: number | null
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

// Valid category choices for a selectable card (admin-managed)
export interface SelectableCategory {
  card_id: string
  category_id: string
}

// Per-user record of which category fills the bonus slot for a selectable card.
// category_ids is an array to support cards that allow multiple choices (e.g. Lady's Solitaire).
// History is preserved via effective_from — the override in effect at a transaction's date is used.
export interface CategoryOverride {
  id: string
  card_id: string
  category_ids: string[]
  effective_from: string
  created_at: string
}

export interface TransactionFormData {
  card_id: string
  category_id: string
  amount: string
  description: string
  transaction_date: string
}
