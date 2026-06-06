import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Sparkles, Receipt, CreditCard, Menu, X, TrendingUp, LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/',             label: 'Dashboard',    Icon: LayoutDashboard },
  { to: '/recommend',    label: 'Recommend',    Icon: Sparkles        },
  { to: '/transactions', label: 'Transactions', Icon: Receipt         },
  { to: '/cards',        label: 'My Cards',     Icon: CreditCard      },
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { user, signOut } = useAuth()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-gray-900 text-white flex flex-col
          transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <TrendingUp size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">MilesMaximiser</span>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-700 space-y-3">
          <p className="text-xs text-gray-500 px-2">Rates are indicative — verify with your bank.</p>
          <div className="flex items-center gap-2 px-2">
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.email?.[0].toUpperCase() ?? '?'}
            </div>
            <span className="text-xs text-gray-400 truncate flex-1">{user?.email}</span>
            <button
              onClick={signOut}
              title="Sign out"
              className="text-gray-500 hover:text-white transition-colors p-1 rounded"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3">
          <button onClick={() => setOpen(true)} className="text-gray-500 hover:text-gray-800">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center">
              <TrendingUp size={12} className="text-white" />
            </div>
            <span className="font-bold text-sm">MilesMaximiser</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
