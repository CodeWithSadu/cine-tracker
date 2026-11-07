import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { analyticsAPI, watchlistAPI } from '../lib/api'
import { Film, Tv, Clock, Search, TrendingUp, BookmarkPlus, PlayCircle, Star } from 'lucide-react'
import clsx from 'clsx'

function StatCard({ icon: Icon, label, value, color = 'text-accent-light' }) {
  return (
    <div className="stat-card">
      <div className={clsx('mb-2', color)}><Icon size={20} /></div>
      <p className="text-2xl font-display font-semibold">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  )
}

function PosterCard({ entry, status }) {
  const [imgErr, setImgErr] = useState(false)
  const m = entry?.media_item
  const statusClass = { plan_to_watch: 'badge-plan', watching: 'badge-watching', watched: 'badge-watched' }[status] || 'badge-plan'
  const statusLabel = { plan_to_watch: 'Plan to watch', watching: 'Watching', watched: 'Watched' }[status] || status
  return (
    <div className="card group hover:border-accent/40 transition-colors duration-200">
      <div className="aspect-[2/3] bg-surface relative">
        {m?.poster_path && !imgErr
          ? <img src={m.poster_path} alt={m.title} className="w-full h-full object-cover" onError={() => setImgErr(true)} />
          : <div className="w-full h-full flex items-center justify-center bg-card">
              {m?.media_type === 'movie' ? <Film size={28} className="text-border" /> : <Tv size={28} className="text-border" />}
            </div>
        }
        <span className={clsx('absolute top-2 left-2', statusClass)}>{statusLabel}</span>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium line-clamp-2 leading-snug">{m?.title}</p>
        {entry.rating && (
          <div className="flex items-center gap-1 mt-1.5">
            <Star size={11} className="text-gold fill-gold" />
            <span className="text-xs text-subtle">{entry.rating}/10</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [watching, setWatching]   = useState([])
  const [plan, setPlan]           = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([
      analyticsAPI.getSummary(),
      watchlistAPI.getAll({ status: 'watching' }),
      watchlistAPI.getAll({ status: 'plan_to_watch' }),
    ]).then(([s, w, p]) => {
      setAnalytics(s.data)
      setWatching(w.data?.slice(0, 6) || [])
      setPlan(p.data?.slice(0, 6) || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const hours = analytics?.estimated_hours ?? 0
  const timeDisplay = hours >= 48 ? `${(hours / 24).toFixed(1)}d` : `${Math.round(hours)}h`

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-display font-semibold text-2xl mb-1">
          Hey, {user?.username} 👋
        </h1>
        <p className="text-muted text-sm">Here's your watch activity at a glance.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Film}       label="Movies watched"    value={loading ? '—' : analytics?.watched_movies ?? 0}     color="text-blue-400" />
        <StatCard icon={Tv}         label="Series watched"    value={loading ? '—' : analytics?.watched_series ?? 0}     color="text-purple-400" />
        <StatCard icon={PlayCircle} label="Currently watching" value={loading ? '—' : analytics?.currently_watching ?? 0} color="text-amber-400" />
        <StatCard icon={Clock}      label="Hours watched"     value={loading ? '—' : timeDisplay}                        color="text-green-400" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/search"    className="btn-primary"><Search size={16} />Find something to watch</Link>
        <Link to="/watchlist" className="btn-ghost border border-border"><BookmarkPlus size={16} />My list</Link>
        <Link to="/analytics" className="btn-ghost border border-border"><TrendingUp size={16} />Analytics</Link>
      </div>

      {watching.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">Continue watching</h2>
            <Link to="/watchlist?status=watching" className="text-xs text-accent-light hover:text-accent">See all</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {watching.map(e => <PosterCard key={e.id} entry={e} status="watching" />)}
          </div>
        </section>
      )}

      {plan.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">Up next</h2>
            <Link to="/watchlist?status=plan_to_watch" className="text-xs text-accent-light hover:text-accent">See all</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {plan.map(e => <PosterCard key={e.id} entry={e} status="plan_to_watch" />)}
          </div>
        </section>
      )}

      {!loading && watching.length === 0 && plan.length === 0 && (
        <div className="card p-12 text-center">
          <Film size={40} className="text-border mx-auto mb-4" />
          <p className="font-medium mb-1">Nothing tracked yet</p>
          <p className="text-sm text-muted mb-6">Search for movies and series to start your list.</p>
          <Link to="/search" className="btn-primary inline-flex"><Search size={16} />Search now</Link>
        </div>
      )}
    </div>
  )
}
