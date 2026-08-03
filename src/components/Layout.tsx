import { useEffect, useState, useRef, Suspense } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Sparkles, Receipt, CreditCard, Menu, X, Smile, LogOut, Info, MessageSquare, ShieldCheck, BarChart2, Calculator, Download, Share, Award, Loader2, RefreshCw,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import Modal from './Modal'
import StatementDayPrompt from './StatementDayPrompt'
import UpdatePrompt from './UpdatePrompt'
import ErrorBoundary from './ErrorBoundary'

const ADMIN_EMAIL = 'vernonlyz@gmail.com'

// BeforeInstallPromptEvent is not in the standard TypeScript lib
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone] = useState(() => window.matchMedia('(display-mode: standalone)').matches)
  const ua = navigator.userAgent
  const isIOS     = /iphone|ipad|ipod/i.test(ua) && !('MSStream' in window)
  const isAndroid = /android/i.test(ua)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const showInstall = !isStandalone

  async function triggerInstall() {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setDeferred(null)
  }

  return { showInstall, isIOS, isAndroid, hasNativePrompt: deferred !== null, triggerInstall }
}

const nav: { to: string; label: string; Icon: typeof LayoutDashboard; match?: string[] }[] = [
  { to: '/',             label: 'Dashboard',    Icon: LayoutDashboard },
  { to: '/recommend',    label: 'Recommend',    Icon: Sparkles        },
  { to: '/transactions', label: 'Transactions', Icon: Receipt         },
  { to: '/expenses',    label: 'Expenses',     Icon: BarChart2       },
  { to: '/calculator',   label: 'Mile Value',   Icon: Calculator      },
  { to: '/cards',        label: 'My Cards',     Icon: CreditCard      },
  { to: '/miles',        label: 'Miles',        Icon: Award, match: ['/miles', '/earnings'] },
]

// Primary destinations for the mobile bottom tab bar; the rest live under "More".
const bottomTabs = [
  { to: '/',             label: 'Home',       Icon: LayoutDashboard },
  { to: '/recommend',    label: 'Recommend',  Icon: Sparkles        },
  { to: '/transactions', label: 'Log',        Icon: Receipt         },
  { to: '/cards',        label: 'Cards',      Icon: CreditCard      },
]

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [disclaimer, setDisclaimer] = useState(false)
  const [feedback, setFeedback] = useState(false)
  const [iosInstall, setIosInstall] = useState(false)
  const [genericInstall, setGenericInstall] = useState(false)
  const [androidInstall, setAndroidInstall] = useState(false)
  const { showInstall, isIOS, isAndroid, hasNativePrompt, triggerInstall } = useInstallPrompt()
  const { refresh } = useApp()
  const location = useLocation()
  const [bannerVisible, setBannerVisible] = useState(
    () => localStorage.getItem('installBannerDismissed') !== '1'
  )

  // Pull-to-refresh + manual refresh (data lives in cached context)
  const mainRef = useRef<HTMLElement>(null)
  const pullStartY = useRef<number | null>(null)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const PULL_THRESHOLD = 60

  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    try { await refresh() } finally {
      setRefreshing(false)
      setPull(0)
    }
  }

  function onTouchStart(e: React.TouchEvent) {
    const el = mainRef.current
    pullStartY.current = el && el.scrollTop <= 0 && !refreshing ? e.touches[0].clientY : null
  }
  function onTouchMove(e: React.TouchEvent) {
    if (pullStartY.current == null || refreshing) return
    const el = mainRef.current
    if (el && el.scrollTop > 0) { pullStartY.current = null; setPull(0); return }
    const delta = e.touches[0].clientY - pullStartY.current
    if (delta > 0) setPull(Math.min(delta * 0.5, 80))
  }
  function onTouchEnd() {
    if (pullStartY.current == null) return
    pullStartY.current = null
    if (pull >= PULL_THRESHOLD) handleRefresh()
    else setPull(0)
  }

  function dismissBanner() {
    localStorage.setItem('installBannerDismissed', '1')
    setBannerVisible(false)
  }

  function handleInstallClick() {
    if (isIOS) setIosInstall(true)
    else if (hasNativePrompt) triggerInstall()
    else if (isAndroid) setAndroidInstall(true)
    else setGenericInstall(true)
  }

  function handleBannerInstall() {
    dismissBanner()
    handleInstallClick()
  }
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
    window.addEventListener('feedback-status-changed', fetchOpenCount)
    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('feedback-status-changed', fetchOpenCount)
    }
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
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Smile size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">SmileMax</span>
          </Link>
          <button
            className="ml-auto lg:hidden text-gray-400 hover:text-white"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ to, label, Icon, match }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) => {
                const active = isActive || (match?.some(m => location.pathname.startsWith(m)) ?? false)
                return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }}
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
          {showInstall && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-indigo-400 hover:bg-gray-800 hover:text-indigo-300 transition-colors text-left"
            >
              {isIOS ? <Share size={16} className="shrink-0" /> : <Download size={16} className="shrink-0" />}
              <span>Add to Home Screen</span>
            </button>
          )}
          <button
            onClick={() => setFeedback(true)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-gray-800 hover:text-white transition-colors text-left"
          >
            <MessageSquare size={16} className="shrink-0" />
            <span>Report a bug / Suggestion</span>
          </button>
          <button
            onClick={() => setDisclaimer(true)}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs text-gray-400 hover:bg-gray-800 hover:text-white transition-colors text-left"
          >
            <Info size={16} className="shrink-0" />
            <span>Rates are indicative — verify with bank</span>
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
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 bg-indigo-500 rounded flex items-center justify-center">
              <Smile size={12} className="text-white" />
            </div>
            <span className="font-bold text-sm">SmileMax</span>
          </Link>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh"
            className="ml-auto text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </header>

        <main
          ref={mainRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="flex-1 overflow-y-auto overscroll-contain p-4 pb-24 lg:p-8"
        >
          {/* Pull-to-refresh indicator (mobile) */}
          {(pull > 0 || refreshing) && (
            <div
              className="lg:hidden flex items-center justify-center overflow-hidden text-gray-500 -mt-2 mb-2"
              style={{ height: refreshing ? 32 : pull }}
            >
              <RefreshCw
                size={18}
                className={refreshing ? 'animate-spin' : ''}
                style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }}
              />
            </div>
          )}
          {showInstall && bannerVisible && location.pathname === '/' && (
            <div className="mb-6 flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
                <Download size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-indigo-900">Install SmileMax as an app</p>
                <p className="text-xs text-indigo-600 mt-0.5">Add to your home screen for quick one-tap access.</p>
              </div>
              <button
                onClick={handleBannerInstall}
                className="shrink-0 text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Install
              </button>
              <button
                onClick={dismissBanner}
                className="shrink-0 text-indigo-400 hover:text-indigo-600 transition-colors"
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={
              <div className="flex items-center justify-center py-20 text-gray-500">
                <Loader2 size={24} className="animate-spin" />
              </div>
            }>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
        <StatementDayPrompt />
        <UpdatePrompt />
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {bottomTabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Menu size={20} />
          More
        </button>
      </nav>

      {genericInstall && (
        <Modal title="Install SmileMax" onClose={() => setGenericInstall(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Install SmileMax as an app using your browser's built-in option:</p>
            <div className="space-y-3">
              {[
                { icon: '🖥️', text: 'Chrome / Edge desktop — click the ⊕ install icon in the address bar, or open the browser menu (⋮) and select "Install SmileMax".' },
                { icon: '📱', text: 'Chrome on Android — tap the browser menu (⋮) and select "Add to Home Screen".' },
                { icon: '🦊', text: 'Firefox — open the browser menu and select "Install" or "Add to Home Screen" if available.' },
              ].map(({ icon, text }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{icon}</span>
                  <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setGenericInstall(false)} className="btn-primary w-full">Got it</button>
          </div>
        </Modal>
      )}

      {androidInstall && (
        <Modal title="Add SmileMax to your Home Screen" onClose={() => setAndroidInstall(false)}>
          <div className="space-y-5">
            <p className="text-sm text-gray-500">Follow these steps in Chrome to install SmileMax:</p>
            <div className="space-y-4">
              {[
                { step: 1, icon: '⋮', text: 'Tap the menu button (three dots) in the top-right corner of Chrome.' },
                { step: 2, icon: '📲', text: 'Tap "Add to Home Screen" from the menu.' },
                { step: 3, icon: '✅', text: 'Tap "Add" to confirm. SmileMax will appear on your home screen like a native app.' },
              ].map(({ step, icon, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0 mt-0.5">
                    {step}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <span className="mr-1 font-medium">{icon}</span>{text}
                  </p>
                </div>
              ))}
            </div>
            <button onClick={() => setAndroidInstall(false)} className="btn-primary w-full">Got it</button>
          </div>
        </Modal>
      )}

      {iosInstall && (
        <Modal title="Add SmileMax to your Home Screen" onClose={() => setIosInstall(false)}>
          <div className="space-y-5">
            <p className="text-sm text-gray-500">Follow these steps in Safari to install SmileMax as an app:</p>
            <div className="space-y-4">
              {[
                { step: 1, icon: '⬆️', text: 'Tap the Share button at the bottom of your screen (the box with an arrow pointing up).' },
                { step: 2, icon: '📲', text: 'Scroll down in the share sheet and tap "Add to Home Screen".' },
                { step: 3, icon: '✅', text: 'Tap "Add" in the top-right corner. SmileMax will appear on your home screen.' },
              ].map(({ step, icon, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0 mt-0.5">
                    {step}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <span className="mr-1">{icon}</span>{text}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">Note: this only works in Safari. If you're using Chrome or another browser on iOS, open this page in Safari first.</p>
            <button onClick={() => setIosInstall(false)} className="btn-primary w-full">Got it</button>
          </div>
        </Modal>
      )}

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
