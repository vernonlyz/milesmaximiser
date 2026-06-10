import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bug, Lightbulb, CheckCircle, Circle, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 'vernonlyz@gmail.com'

interface FeedbackRow {
  id: string
  user_email: string | null
  type: 'bug' | 'suggestion'
  message: string
  status: 'open' | 'resolved'
  created_at: string
}

type Filter = 'all' | 'open' | 'resolved'

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('open')
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    if (user?.email !== ADMIN_EMAIL) {
      navigate('/')
      return
    }
    load()
  }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
    setRows((data as FeedbackRow[]) ?? [])
    setLoading(false)
  }

  async function toggleStatus(row: FeedbackRow) {
    setToggling(row.id)
    const next = row.status === 'open' ? 'resolved' : 'open'
    await supabase.from('feedback').update({ status: next }).eq('id', row.id)
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: next } : r))
    setToggling(null)
  }

  const displayed = rows.filter(r => filter === 'all' || r.status === filter)
  const openCount     = rows.filter(r => r.status === 'open').length
  const resolvedCount = rows.filter(r => r.status === 'resolved').length

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {openCount} open · {resolvedCount} resolved
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['open', 'resolved', 'all'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : displayed.length === 0 ? (
        <div className="card p-10 text-center text-gray-400 text-sm border-dashed border-2 border-gray-200">
          No {filter === 'all' ? '' : filter} feedback yet.
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(row => (
            <div
              key={row.id}
              className={`card p-4 transition-opacity ${row.status === 'resolved' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Type icon */}
                <div className={`shrink-0 mt-0.5 p-1.5 rounded-lg ${
                  row.type === 'bug' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                }`}>
                  {row.type === 'bug' ? <Bug size={14} /> : <Lightbulb size={14} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      row.type === 'bug'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {row.type === 'bug' ? 'Bug report' : 'Suggestion'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {row.user_email ?? 'Anonymous'} · {new Date(row.created_at).toLocaleDateString('en-SG', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-gray-700 whitespace-pre-wrap">{row.message}</p>
                </div>

                {/* Status toggle */}
                <button
                  onClick={() => toggleStatus(row)}
                  disabled={toggling === row.id}
                  title={row.status === 'open' ? 'Mark as resolved' : 'Reopen'}
                  className="shrink-0 text-gray-300 hover:text-emerald-500 transition-colors disabled:opacity-40"
                >
                  {row.status === 'resolved'
                    ? <CheckCircle size={20} className="text-emerald-500" />
                    : <Circle size={20} />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
