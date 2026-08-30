// The small colour-coded 2-letter bank square used across the app (wallet, cards,
// recommendations, onboarding). One component so size/shape stay consistent.
export default function BankBadge({ bank, color, size = 'md' }: { bank: string; color: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const dims =
    size === 'sm' ? 'w-4 h-4 text-[8px] rounded'
    : size === 'lg' ? 'w-6 h-6 text-[10px] rounded'
    : size === 'xl' ? 'w-9 h-9 text-xs rounded-xl'
    : 'w-5 h-5 text-[9px] rounded'
  return (
    <div
      className={`${dims} flex items-center justify-center text-white font-bold shrink-0`}
      style={{ backgroundColor: color }}
    >
      {bank.slice(0, 2).toUpperCase()}
    </div>
  )
}
