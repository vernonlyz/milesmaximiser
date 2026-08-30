import { CardRecommendation } from './types'

// A short, colour-coded "why" note derived from a recommendation's cap/channel
// state — shared by the log-form rec widget and the Recommend page so they stay in
// sync. Returns null when there's nothing cap/channel-specific to say (the caller
// may then add MCC-gate notes it computes itself).
export function capChannelNote(rec: CardRecommendation, categoryName: string): { text: string; tone: string } | null {
  const method = rec.bestChannel
    ? (rec.bestChannel === 'contactless' ? 'tap to pay' : 'online')
    : rec.requiredPaymentChannel === 'contactless' ? 'tap to pay'
    : rec.requiredPaymentChannel === 'online' ? 'online' : null
  const cat = categoryName || 'this category'
  const m = method ? ` · ${method}` : ''
  const round = (n: number) => Math.round(n).toLocaleString()

  if (rec.status === 'capped') return { text: `${cat} cap reached${m} — earns base`, tone: 'text-red-600' }
  if (rec.status === 'partial') return { text: `S$${round(rec.capRemaining ?? 0)} left in ${cat} cap${m}`, tone: 'text-amber-600' }
  if (rec.bestChannel) return { text: `best via ${method}${rec.capRemaining != null ? ` · S$${round(rec.capRemaining)} cap left` : ''}`, tone: 'text-emerald-600' }
  return null
}
