import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme, Theme } from '../lib/useTheme'

// Compact 3-way theme switch: Light / Dark / System.
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const opts: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ]
  return (
    <div className={`inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {opts.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          aria-label={label}
          aria-pressed={theme === value}
          className={`px-2 py-1.5 transition-colors ${
            theme === value
              ? 'bg-indigo-600 text-white'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  )
}
