import { CardMccEligibility, CreditCard, CategoryOverride, Category } from './types'
import { resolveOverride } from './recommendations'

export type MccChannel = 'online' | 'contactless' | 'chip' | null
export type MccEligibility = { state: 'eligible' | 'ineligible' | 'reduced' | 'nodata'; label?: string | null; note?: string | null }

const inRange = (r: CardMccEligibility, mcc: string) => mcc >= r.mcc_start && mcc <= r.mcc_end
const addNote = (a: string | null | undefined, b: string) => (a ? `${a} · ${b}` : b)

// The user's chosen bonus-category names for a selectable card (e.g. UOB Lady's
// Solitaire), used to gate the whitelist so only chosen categories show eligible.
// Returns undefined for non-selectable cards (no gating).
export function chosenCategoryLabels(
  card: CreditCard, overrides: CategoryOverride[], categories: Category[], date: Date = new Date(),
): string[] | undefined {
  if (!card.selectable_category) return undefined
  const ids = resolveOverride(overrides, card.id, date) ?? []
  return ids.map(id => categories.find(c => c.id === id)?.name).filter((n): n is string => !!n)
}

// Apply a card-level online-only (bonus_channel) restriction to an otherwise-eligible verdict.
function channelScoped(card: CreditCard, channel: MccChannel | undefined, label: string | null, note: string | null): MccEligibility {
  const bc = card.bonus_channel
  if (!bc) return { state: 'eligible', label, note }
  if (channel == null) return { state: 'eligible', label, note: addNote(note, `${bc} only`) }
  if (channel !== bc) return { state: 'ineligible', label, note: `earns base — ${bc} only` }
  return { state: 'eligible', label, note }
}

// Resolve whether a 4-digit MCC earns the bonus on a card, honoring its eligibility
// mode, the payment channel, and (for selectable cards) the user's chosen categories:
//   whitelist — listed MCCs earn; others don't. `chosenLabels` gates selectable cards.
//   blacklist — everything earns except the listed MCCs.
//   hybrid    — contactless earns on all MCCs; online only on listed MCCs; chip = base.
// Also honours card.bonus_channel (bonus applies only on that channel, e.g. online)
// and per-row `always_eligible` (earns on any channel, e.g. Citi in-store fashion).
export function resolveMccEligibility(
  card: CreditCard, mcc: string, rows: CardMccEligibility[], channel?: MccChannel, chosenLabels?: string[],
): MccEligibility {
  if (!card.mcc_mode) return { state: 'nodata' }
  const cardRows = rows.filter(r => r.card_id === card.id)

  if (card.mcc_mode === 'hybrid') {
    const excluded = cardRows.find(r => r.payment_channel == null && inRange(r, mcc))
    if (excluded) return { state: 'ineligible', note: excluded.note ?? 'excluded on this card' }
    const hasOnlineRows = cardRows.some(r => r.payment_channel === 'online')
    const onlineHit = cardRows.find(r => r.payment_channel === 'online' && inRange(r, mcc))
    if (channel === 'contactless') return { state: 'eligible', label: 'Contactless', note: 'contactless earns on all MCCs' }
    if (channel === 'online') return onlineHit
      ? { state: 'eligible', label: onlineHit.category_label, note: onlineHit.note }
      : { state: 'ineligible', note: hasOnlineRows ? 'not in the online bonus list' : 'online earns base — bonus is contactless only' }
    if (channel === 'chip') return { state: 'ineligible', note: 'chip/swipe earns base — tap to pay' }
    return onlineHit
      ? { state: 'eligible', label: onlineHit.category_label, note: 'online & contactless' }
      : { state: 'eligible', label: 'Contactless', note: 'contactless only — online earns base' }
  }

  // Any-channel inclusions (e.g. Citi Rewards in-store fashion) win over the
  // card's online-only restriction.
  const incl = cardRows.find(r => r.always_eligible && inRange(r, mcc))
  if (incl) return { state: 'eligible', label: incl.category_label ?? null, note: incl.note ?? 'in-store & online' }

  // whitelist / blacklist — rows may be channel-scoped (payment_channel). An
  // unspecified channel matches any row, flagging the requirement in the note.
  const chOk = (r: CardMccEligibility) => channel == null || r.payment_channel == null || r.payment_channel === channel
  const matched = cardRows.find(r => !r.always_eligible && inRange(r, mcc) && chOk(r))

  if (card.mcc_mode === 'blacklist') {
    if (matched) return { state: matched.reduced ? 'reduced' : 'ineligible', label: matched.category_label ?? null, note: matched.note ?? null }
    return channelScoped(card, channel, null, null)
  }

  // whitelist
  if (matched) {
    // Selectable cards: only the user's chosen categories earn the bonus.
    if (card.selectable_category && chosenLabels !== undefined) {
      if (chosenLabels.length === 0)
        return { state: 'eligible', label: matched.category_label ?? null, note: addNote(matched.note ?? null, 'set your bonus categories in My Cards') }
      if (matched.category_label && !chosenLabels.includes(matched.category_label))
        return { state: 'ineligible', label: matched.category_label, note: 'not your chosen category' }
    }
    if (matched.reduced) return { state: 'reduced', label: matched.category_label ?? null, note: matched.note ?? null }
    let note = matched.note ?? null
    if (matched.payment_channel && channel == null) note = addNote(note, `${matched.payment_channel} only`)
    return channelScoped(card, channel, matched.category_label ?? null, note)
  }
  // Listed only for a different channel than the one used → earns base here.
  const otherChannel = channel != null ? cardRows.find(r => inRange(r, mcc) && r.payment_channel && r.payment_channel !== channel) : undefined
  if (otherChannel) return { state: 'ineligible', note: `bonus is ${otherChannel.payment_channel} only` }
  return { state: 'ineligible', label: null, note: null }
}
