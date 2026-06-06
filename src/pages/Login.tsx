import { useState, FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { TrendingUp, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { session, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [signUpDone, setSignUpDone] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'signin') {
      const err = await signIn(email, password)
      if (err) setError(err)
    } else {
      const err = await signUp(email, password)
      if (err) setError(err)
      else setSignUpDone(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">MilesMaximiser</span>
        </div>

        <div className="card p-8">
          {signUpDone ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl">✉️</span>
              </div>
              <p className="font-semibold text-gray-900">Check your email</p>
              <p className="text-sm text-gray-500">
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
              </p>
              <button
                className="text-sm text-indigo-600 hover:underline"
                onClick={() => { setSignUpDone(false); setMode('signin') }}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h1 className="text-lg font-semibold text-gray-900 text-center mb-6">
                {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
              </h1>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                {loading
                  ? <Loader2 size={16} className="animate-spin" />
                  : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>

              <p className="text-center text-sm text-gray-500">
                {mode === 'signin' ? (
                  <>Don't have an account?{' '}
                    <button type="button" onClick={() => { setMode('signup'); setError(null) }}
                      className="text-indigo-600 hover:underline font-medium">
                      Sign up
                    </button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button type="button" onClick={() => { setMode('signin'); setError(null) }}
                      className="text-indigo-600 hover:underline font-medium">
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
