import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Sparkles, Receipt, CreditCard, Menu, X, TrendingUp, LogOut, Info, MessageSquare, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import Modal from './Modal'

const ADMIN_EMAIL = 'vernonlyz@gmail.com'

const nav = [
  { to: '/',             label: 'Dashboard',    Icon: LayoutDashboard },
  { to: '/recommend',    label: 'Recommend',    Icon: Sparkles        },
  { to: '/transactions', label: 'Transactions', Icon: Receipt         },
  { to: '/cards',        label: 'My Cards',     Icon: CreditCard      },
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [disclaimer, setDisclaimer] = useState(false)
  const [feedback, setFeedback] = useState(false)
  const [fbType, setFbType] = useState<'bug' | 'suggestion'>('bug')
  const [fbMsg, setFbMsg] = useState('')
  const [fbSaving, setFbSaving] = useState(false)
  const [fbDone, setFbDone] = useState(false)
  const { user, signOut } = useAuth()

  const isAdmin = user?.email === ADMIN_EMAIL
  const [openCount, setOpenCount] = useState(0)

  useEffect(() => {
    if (!isAdmin) return
    fetchOpenCount()
    const channel = supabase
      .channel('feedback-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, fetchOpenCount)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [isAdmin])

  async function fetchOpenCount() {
    const { count } = await supabase
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
    setOpenCount(count ?? 0)
  }

  async function submitFeedback() {
    if (!fbMsg.trim()) return
    setFbSaving(true)
    await supabase.from('feedback').insert({
      user_id:    user?.id,
      user_email: user?.email,
      type:       fbType,
      message:    fbMsg.trim(),
    })
    setFbSaving(false)
    setFbDone(true)
  }

  function closeFeedback() {
    setFeedback(false)
    setFbMsg('')
    setFbDone(false)
  }

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
          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <ShieldCheck size={18} />
              Admin
              {openCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {openCount}
                </span>
              )}
            </NavLink>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-gray-700 space-y-1">
          <button
            onClick={() => setFeedback(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <MessageSquare size={13} />
            Report a bug / Suggestion
          </button>
          <button
            onClick={() => setDisclaimer(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <Info size={13} />
            Rates are indicative — verify with bank
          </button>
          <div className="flex items-center gap-2 px-3 pt-2">
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

      {disclaimer && (
        <Modal title="Disclaimer" onClose={() => setDisclaimer(false)}>
          <p className="text-sm text-gray-600 leading-relaxed">
            The information provided by this app, including merchant category codes (MCCs), reward
            rates, bonus eligibility, and other card-related data, is derived from a privately
            maintained catalogue and should be treated as a best-effort reference only.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mt-3">
            While we strive to keep the information accurate and up to date, we do not guarantee
            its completeness or correctness. Users should verify details with the respective card
            issuers and exercise their own discretion when recording transactions or making
            financial decisions.
          </p>
        </Modal>
      )}

      {feedback && (
        <Modal title="Report a bug / Suggestion" onClose={closeFeedback}>
          {fbDone ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-3xl">🎉</p>
              <p className="font-semibold text-gray-800">Thanks for the feedback!</p>
              <p className="text-sm text-gray-500">We'll look into it.</p>
              <button onClick={closeFeedback} className="btn-primary mt-4">Close</button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Type toggle */}
              <div className="flex gap-2">
                {(['bug', 'suggestion'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFbType(t)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      fbType === t
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {t === 'bug' ? '🐛 Bug report' : '💡 Suggestion'}
                  </button>
                ))}
              </div>

              {/* Message */}
              <div>
                <label className="label">
                  {fbType === 'bug' ? 'What went wrong?' : 'What would you like to see?'}
                </label>
                <textarea
                  rows={5}
                  className="input resize-none"
                  placeholder={
                    fbType === 'bug'
                      ? 'Describe what happened and what you expected…'
                      : 'Describe your idea or improvement…'
                  }
                  value={fbMsg}
                  onChange={e => setFbMsg(e.target.value)}
                />
              </div>

              <button
                type="button"
                disabled={!fbMsg.trim() || fbSaving}
                onClick={submitFeedback}
                className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {fbSaving ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
