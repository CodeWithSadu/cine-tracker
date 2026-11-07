import { useEffect, useState } from 'react'
import { analyticsAPI } from '../lib/api'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Clock, Film, Tv, PlayCircle, Bookmark, BarChart2, Loader2 } from 'lucide-react'

const COLORS = ['#7c5cfc','#a48afd','#5538d4','#3b21b8','#f5c842','#60a5fa']

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm shadow-card">
      <p className="font-medium">{label || payload[0].name}</p>
      <p className="text-accent-light">{payload[0].value}{label ? ' titles' : ''}</p>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData]   = useState(null)
  const [loading, setL]   = useState(true)

  useEffect(() => {
    analyticsAPI.getSummary().then(r => setData(r.data)).catch(console.error).finally(() => setL(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={28} className="text-accent animate-spin" /></div>
  if (!data)   return <div className="p-8 text-center text-muted">Could not load analytics.</div>

  const hours = data.estimated_hours ?? 0
  const display = hours >= 48 ? `${(hours/24).toFixed(1)} days` : `${Math.round(hours)} hours`

  const breakdownData = [
    { name: 'Movies',  value: data.watched_movies ?? 0 },
    { name: 'Series',  value: data.watched_series ?? 0 },
  ].filter(d => d.value > 0)

  const statusData = [
    { name: 'Watched',       value: (data.watched_movies??0) + (data.watched_series??0) },
    { name: 'Watching',      value: data.currently_watching ?? 0 },
    { name: 'Plan to watch', value: data.plan_to_watch ?? 0 },
  ].filter(d => d.value > 0)

  const genreData = (data.top_genres ?? []).map(g => ({ name: g.genre, count: g.count }))

  const STATS = [
    { icon: Clock,      label: 'Time watched',      value: display,                               color: 'text-green-400'  },
    { icon: Film,       label: 'Movies watched',    value: data.watched_movies  ?? 0,             color: 'text-blue-400'   },
    { icon: Tv,         label: 'Series watched',    value: data.watched_series  ?? 0,             color: 'text-purple-400' },
    { icon: PlayCircle, label: 'Watching now',      value: data.currently_watching ?? 0,          color: 'text-amber-400'  },
    { icon: Bookmark,   label: 'Plan to watch',     value: data.plan_to_watch ?? 0,               color: 'text-accent-light'},
  ]

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <h1 className="font-display font-semibold text-2xl">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {STATS.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="stat-card">
            <div className={`mb-2 ${color}`}><Icon size={18} /></div>
            <p className="text-xl font-display font-semibold leading-none">{value}</p>
            <p className="text-sm text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {(breakdownData.length > 0 || statusData.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-6">
          {breakdownData.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display font-semibold mb-4">Movies vs Series</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={breakdownData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                    {breakdownData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip content={<Tip />} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-subtle text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {statusData.length > 0 && (
            <div className="card p-6">
              <h2 className="font-display font-semibold mb-4">By Status</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i+2]} />)}
                  </Pie>
                  <Tooltip content={<Tip />} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-subtle text-xs">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {genreData.length > 0 && (
        <div className="card p-6">
          <h2 className="font-display font-semibold mb-4">Top Genres</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={genreData} margin={{ left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {genreData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {(data.recently_watched ?? []).length > 0 && (
        <div className="card p-6">
          <h2 className="font-display font-semibold mb-4">Recently Watched</h2>
          <div className="space-y-3">
            {data.recently_watched.map(entry => {
              const m = entry.media_item
              return (
                <div key={entry.id} className="flex items-center gap-3">
                  <div className="w-8 h-12 rounded overflow-hidden bg-surface shrink-0">
                    {m?.poster_path
                      ? <img src={m.poster_path} alt={m.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Film size={13} className="text-border" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m?.title}</p>
                    <p className="text-xs text-muted">{m?.media_type === 'movie' ? 'Movie' : 'Series'}</p>
                  </div>
                  {entry.rating && <span className="text-xs text-gold font-medium shrink-0">{entry.rating}/10</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {breakdownData.length === 0 && statusData.length === 0 && (
        <div className="card p-12 text-center">
          <BarChart2 size={40} className="text-border mx-auto mb-3" />
          <p className="font-medium mb-1">No data yet</p>
          <p className="text-sm text-muted">Track movies and series to see your analytics here.</p>
        </div>
      )}
    </div>
  )
}
