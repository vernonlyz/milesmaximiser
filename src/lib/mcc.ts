import { CardMccEligibility, CreditCard } from './types'

export type MccChannel = 'online' | 'contactless' | 'chip' | null
export type MccEligibility = { state: 'eligible' | 'ineligible' | 'nodata'; label?: string | null; note?: string | null }

const inRange = (r: CardMccEligibility, mcc: string) => mcc >= r.mcc_start && mcc <= r.mcc_end

// Resolve whether a 4-digit MCC earns the bonus on a card, honoring its eligibility
// mode and (where relevant) the payment channel:
//   whitelist — listed MCCs earn; others don't.
//   blacklist — everything earns except the listed MCCs.
//   hybrid    — contactless earns on all MCCs; online earns only on the listed
//               'online' MCCs; null-channel rows are exclusions on every channel;
//               chip/swipe earns base. (e.g. UOB Preferred Platinum Visa.)
// Rows may be channel-scoped via payment_channel (null = all channels).
// Returns 'nodata' when the card has no eligibility model (mcc_mode not set).
export function resolveMccEligibility(
  card: CreditCard, mcc: string, rows: CardMccEligibility[], channel?: MccChannel,
): MccEligibility {
  if (!card.mcc_mode) return { state: 'nodata' }
  const cardRows = rows.filter(r => r.card_id === card.id)

  if (card.mcc_mode === 'hybrid') {
    // Exclusions (all channels) always win.
    const excluded = cardRows.find(r => r.payment_channel == null && inRange(r, mcc))
    if (excluded) return { state: 'ineligible', note: excluded.note ?? 'excluded on this card' }
    const hasOnlineRows = cardRows.some(r => r.payment_channel === 'online')
    const onlineHit = cardRows.find(r => r.payment_channel === 'online' && inRange(r, mcc))
    if (channel === 'contactless') return { state: 'eligible', label: 'Contactless', note: 'contactless earns on all MCCs' }
    if (channel === 'online') return onlineHit
      ? { state: 'eligible', label: onlineHit.category_label, note: onlineHit.note }
      : { state: 'ineligible', note: hasOnlineRows ? 'not in the online bonus list' : 'online earns base — bonus is contactless only' }
    if (channel === 'chip') return { state: 'ineligible', note: 'chip/swipe earns base — tap to pay' }
    // Channel unspecified: contactless always earns; online only if listed.
    return onlineHit
      ? { state: 'eligible', label: onlineHit.category_label, note: 'online & contactless' }
      : { state: 'eligible', label: 'Contactless', note: 'contactless only — online earns base' }
  }

  const chOk = (r: CardMccEligibility) => r.payment_channel == null || r.payment_channel === channel
  const matched = cardRows.find(r => inRange(r, mcc) && chOk(r))
  const eligible = card.mcc_mode === 'whitelist' ? !!matched : !matched
  return { state: eligible ? 'eligible' : 'ineligible', label: matched?.category_label ?? null, note: matched?.note ?? null }
}
