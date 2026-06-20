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
  default_payment_channel: 'contactless' | 'online' | null  // pre-fills payment method in the log form
  cap_cycle: 'calendar' | 'statement'  // whether caps reset on statement date or calendar month
  earn_increment: number  // miles awarded per $N block: 1 for HSBC/Citi, 5 for most other banks
  card_type: 'miles' | 'cashback' | 'debit'
  cashback_rate: number | null  // base cashback rate, e.g. 0.015 = 1.5%; null for miles/debit cards
  created_at: string
}

// Per-category cashback rate override for a cashback card
export interface CashbackRate {
  id: string
  card_id: string
  category_id: string
  cashback_rate: number
  effective_from: string
}

// Bonus earn rate for a library card — has effective_from for versioning
export interface CardRate {
  id: string
  card_id: string
  category_id: string | null  // null = wildcard: earns bonus on any category via the specified payment_channel
  mpd: number
  payment_channel: 'contactless' | 'online' | null  // null = any payment method earns the bonus
  effective_from: string
}

// Spending cap for a library card — spend_limit null = cap removed.
// cap_group: when non-null, all caps for this card sharing the same cap_group
// draw from a single combined spending limit (e.g. HSBC Revolution's S$1,000
// pool shared across dining, shopping, transport and travel).
// min_spend: when non-null, the card's total period spend must reach this
// threshold before the bonus rate activates (e.g. UOB Visa Sig S$1,000/month).
// cap_payment_channel: when non-null, only transactions with this payment method
// count toward this cap (e.g. UOB Preferred Plat's S$600 contactless pool).
export interface SpendingCap {
  id: string
  card_id: string
  category_id: string | null
  cap_period: 'monthly' | 'quarterly' | 'annual' | 'per_transaction'
  spend_limit: number | null
  cap_group: string | null
  min_spend: number | null
  cap_payment_channel: 'contactless' | 'online' | null
  effective_from: string
}

// Which library cards a user has in their wallet
export interface UserCardSelection {
  user_id: string
  card_id: string
  statement_day: number | null  // day of month the statement closes (1–28); null = use calendar month
  created_at: string
}

export interface Transaction {
  id: string
  card_id: string | null
  category_id: string | null
  amount: number
  description: string | null
  vendor_name: string | null    // typed or selected from vendor_catalogue
  mcc: string | null            // informational; auto-filled from catalogue or manually entered
  payment_channel: 'contactless' | 'online' | 'chip' | null  // how the transaction was paid
  transaction_date: string
  computed_mpd: number | null   // engine-calculated MPD at save time
  manual_mpd: number | null     // user override; null = no override
  override_note: string | null  // reason for override
  effective_mpd: number | null  // COALESCE(manual_mpd, computed_mpd) — final applied value
  miles_earned: number | null
  cashback_earned: number | null  // computed at save for cashback cards; null for miles/debit
  personal_amount: number | null  // user's own share when paying for a group; null = full amount
  created_at: string
}

// MCC (Merchant Category Code) catalogue — admin-seeded reference
export interface MccEntry {
  code: string
  description: string
  default_category_id: string | null
}

// Admin-seeded known vendor with default MCC and category
export interface Vendor {
  id: string
  name: string
  default_mcc: string | null
  default_category_id: string | null
  active: boolean
}

export interface CardRecommendation {
  card: CreditCard
  bonusMpd: number
  effectiveMpd: number
  milesEarned: number
  capRemaining: number | null
  capAmount: number | null
  capPeriod: string | null
  status: 'optimal' | 'partial' | 'capped' | 'base' | 'locked'
  // Non-null when the cap has a min_spend threshold (regardless of whether it's met)
  minSpendRequired: number | null
  totalCardSpent: number | null
  // Payment channel required to earn the bonus rate; null = no restriction
  requiredPaymentChannel: 'contactless' | 'online' | null
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

// A miles balance owner. One card = pool-of-one; UOB-style pooling = many cards.
export interface MilesAccount {
  id: string
  user_id: string
  name: string
  opening_miles: number
  as_of_date: string   // snapshot date; app-tracked miles only count txns after this
  expiry_date: string | null
  updated_at: string
}

// Link: which cards feed an account (a card belongs to exactly one account).
export interface MilesAccountCard {
  account_id: string
  card_id: string
  user_id: string
}

// Dated manual adjustment: redemptions (negative) and bonuses/transfers (positive).
export interface MilesAdjustment {
  id: string
  account_id: string
  user_id: string
  adjustment_date: string
  miles: number
  note: string | null
  created_at: string
}

// A saved transaction template for quick reuse of recurring charges.
// Stores only reusable inputs; miles/cashback are recomputed at log time.
export interface TransactionFavourite {
  id: string
  user_id: string
  label: string
  card_id: string | null
  category_id: string | null
  vendor_name: string | null
  mcc: string | null
  payment_channel: 'contactless' | 'online' | 'chip' | null
  amount: number | null
  description: string | null
  created_at: string
}

export interface TransactionFormData {
  card_id: string
  category_id: string
  amount: string
  description: string
  transaction_date: string
}
