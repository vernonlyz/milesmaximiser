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
  // Crediting schedule (for reconciliation) — how/when the bank credits base & bonus.
  base_timing?: 'on_post' | 'statement_close'
  bonus_timing?: 'on_post' | 'statement_close' | 'next_calendar_month' | 'quarter_end'
  bonus_by_category?: boolean
  bonus_rounding?: 'per_transaction' | 'aggregate'  // aggregate = sum eligible spend, then floor once
  no_bonus_split?: boolean          // credits full earned miles as one (e.g. KrisFlyer Visa) — no base/bonus split
  mcc_mode?: 'whitelist' | 'blacklist' | 'hybrid' | null  // how card_mcc_eligibility rows are interpreted (hybrid = channel-dependent)
  bonus_channel?: 'online' | 'contactless' | null  // if set, the whitelist/blacklist bonus applies only on this channel (e.g. DBS WWMC / Citi Rewards = online)
  // Optional rate boost unlocked by a linked product (e.g. UOB Lady's Savings Account).
  boost_mpd?: number | null       // bonus-category rate when the boost is enabled
  boost_cap?: number | null       // monthly bonus cap when the boost is enabled (e.g. HSBC Revolution + EGA → S$1,200)
  boost_label?: string | null     // what unlocks it, shown on the toggle
  rate_boost?: boolean            // per-user runtime flag: boost active as of the resolution date (from user_card_boosts)
  created_at: string
}

// Per-user card-name alias for the Admin CSV export. category_id null = the
// card's default alias; category_id set = a category-specific alias (Lady's).
export interface CardExportAlias {
  id: string
  user_id: string
  card_id: string
  category_id: string | null
  alias: string
  created_at: string
}

// A dated on/off toggle for a card's rate boost (effective-dated like overrides).
export interface CardBoost {
  id: string
  user_id: string
  card_id: string
  effective_from: string
  enabled: boolean
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
  reconciled: boolean             // checked off against the user's bank statement
  recurring_id: string | null     // set when generated from a recurring rule
  created_at: string
}

// MCC (Merchant Category Code) catalogue — admin-seeded reference
export interface MccEntry {
  code: string
  description: string
  default_category_id: string | null
}

// Bonus-eligible MCC range for a card (mcc_start = mcc_end for single codes).
export interface CardMccEligibility {
  id: string
  card_id: string
  category_label: string | null
  mcc_start: string
  mcc_end: string
  note: string | null
  payment_channel: 'online' | 'contactless' | null  // null = applies to all channels
  reduced: boolean  // matched row earns a reduced rate (not full, not zero) — e.g. UOB Absolute 0.3%
  always_eligible: boolean  // earns the bonus on ANY channel, overriding the card's bonus_channel (e.g. Citi in-store fashion)
}

// Admin-seeded known vendor with default MCC and category
export interface Vendor {
  id: string
  name: string
  default_mcc: string | null
  default_category_id: string | null
  mcc_confidence: 'unverified' | 'likely' | 'confirmed'  // how sure the default MCC is
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
  // When no method was selected and one channel wins the cap-aware sweep, the method
  // to use to achieve this result (else null: a method was given, or channel-agnostic).
  bestChannel: 'contactless' | 'online' | null
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

// A dated snapshot of an account's total balance (kept across reconciles).
export interface MilesBalanceHistory {
  id: string
  user_id: string
  account_id: string
  balance: number
  as_of_date: string
  source: 'reconcile' | 'manual'
  created_at: string
}

// ── Reward points (EXPERIMENTAL) ──────────────────────────────────────────
// A bank reward currency (UOB UNI$, DBS Points, …) that converts to miles.
export interface RewardProgram {
  id: string
  name: string
  unit_label: string
  miles_per_point: number       // 1 point → this many miles
  convert_block: number | null  // min transfer unit (points)
  transfer_fee: number | null
  points_expiry_months: number | null
  transfer_partner: string | null
  notes: string | null
}

// Shared library link: which currency a card earns.
export interface CardRewardProgram {
  card_id: string
  program_id: string
}

// Per-user points balance snapshot for one program (the program is the pool).
export interface PointsAccount {
  id: string
  user_id: string
  program_id: string
  opening_points: number
  as_of_date: string   // app-tracked points only count txns after this
  expiry_date: string | null
  updated_at: string
}

// Dated manual points adjustment: redemptions/conversions (negative), bonuses (positive).
export interface PointsAdjustment {
  id: string
  account_id: string
  user_id: string
  adjustment_date: string
  points: number
  note: string | null
  created_at: string
}

// Reconciliation of one credit event (card × cycle × kind [× category]).
// Expected is recomputed from transactions; only actual/reconciled/note persist.
export interface CreditReconciliation {
  id: string
  user_id: string
  card_id: string
  kind: 'base' | 'bonus'
  cycle_month: string        // 'YYYY-MM-01'
  category_id: string | null
  actual_points: number | null
  actual_miles: number | null
  reconciled: boolean
  mismatch_resolved: boolean  // user accepted the expected/actual difference
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
  recurrence: 'monthly' | null     // legacy flag (superseded by recur_unit)
  recur_day: number | null         // legacy day-of-month
  next_due_date: string | null     // legacy next-due (due→confirm model)
  // Recurring rule: repeat every recur_interval × recur_unit from start_date.
  recur_unit: 'day' | 'week' | 'month' | 'year' | null  // null = plain (non-recurring) template
  recur_interval: number           // every N units (default 1)
  start_date: string | null        // first occurrence (YYYY-MM-DD)
  end_date: string | null          // optional last date
  max_occurrences: number | null   // optional cap on total occurrences
  created_at: string
}

export interface TransactionFormData {
  card_id: string
  category_id: string
  amount: string
  description: string
  transaction_date: string
}
