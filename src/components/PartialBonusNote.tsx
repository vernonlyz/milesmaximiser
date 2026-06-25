import { CardRecommendation } from '../lib/types'

// When a transaction partially exceeds a cap, the spend splits: the part that
// still fits the remaining cap earns the bonus rate, the overflow earns base.
// Shows both portions so the bonus isn't hidden behind the blended rate.
export default function PartialBonusNote({ amount, rec }: { amount: number; rec: CardRecommendation }) {
  if (rec.status !== 'partial' || rec.capRemaining == null) return null
  // Miles are earned on the amount rounded down to the card's earn block (e.g. $5),
  // so split that figure — matching the engine — not the raw amount.
  const inc = rec.card.earn_increment || 1
  const earnAmount = Math.floor(amount / inc) * inc
  const within = Math.min(earnAmount, rec.capRemaining)
  const over = Math.max(0, earnAmount - within)
  if (within <= 0 || over <= 0) return null

  const money = (n: number) => `S$${n.toFixed(2)}`

  return (
    <div className="mt-2 space-y-1 text-xs">
      <div className="flex items-center gap-1.5 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span><span className="font-semibold">{rec.bonusMpd.toFixed(rec.bonusMpd % 1 ? 1 : 0)} mpd</span> on {money(within)} <span className="text-gray-400">within cap</span></span>
        <span className="ml-auto tabular-nums text-emerald-700 font-medium">+{Math.round(within * rec.bonusMpd).toLocaleString()} mi</span>
      </div>
      <div className="flex items-center gap-1.5 text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
        <span><span className="font-semibold">{rec.card.base_mpd.toFixed(rec.card.base_mpd % 1 ? 1 : 0)} mpd</span> on {money(over)} <span className="text-gray-400">over cap</span></span>
        <span className="ml-auto tabular-nums">+{Math.round(over * rec.card.base_mpd).toLocaleString()} mi</span>
      </div>
    </div>
  )
}
