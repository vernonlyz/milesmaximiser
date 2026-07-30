import { CardMccEligibility, CreditCard } from './types'

export type MccEligibility = { state: 'eligible' | 'ineligible' | 'nodata'; label?: string | null; note?: string | null }

// Resolve whether a 4-digit MCC earns the bonus on a card, honoring its eligibility
// mode: whitelist (listed = eligible) vs blacklist (listed = excluded).
// Returns 'nodata' when the card has no eligibility model (mcc_mode not set).
export function resolveMccEligibility(card: CreditCard, mcc: string, rows: CardMccEligibility[]): MccEligibility {
  if (!card.mcc_mode) return { state: 'nodata' }
  const matched = rows.find(r => r.card_id === card.id && mcc >= r.mcc_start && mcc <= r.mcc_end)
  const eligible = card.mcc_mode === 'whitelist' ? !!matched : !matched
  return { state: eligible ? 'eligible' : 'ineligible', label: matched?.category_label ?? null, note: matched?.note ?? null }
}
