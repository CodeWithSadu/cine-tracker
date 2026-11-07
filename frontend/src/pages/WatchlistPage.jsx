import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { watchlistAPI } from '../lib/api'
import { Film, Tv, Star, Trash2, Edit2, X, Check, Loader2, List } from 'lucide-react'
import clsx from 'clsx'

function StarRating({ value, onChange }) {
  const [hov, setHov] = useState(0)
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHov(n)} onMouseLeave={() => setHov(0)}
          onClick={() => onChange(n === value ? null : n)}
          className={clsx('transition-colors', n <= (hov || value) ? 'text-gold' : 'text-border')}>
          <Star size={14} fill={n <= (hov || value) ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

function EditModal({ entry, onClose, onSave }) {
  const [form, setForm] = useState({
    status: entry.status, rating: entry.rating ?? null,
    review_notes: entry.review_notes ?? '',
    date_watched: entry.date_watched ? entry.date_watched.split('T')[0] : '',
    current_season: entry.current_season ?? 1, current_episode: entry.current_episode ?? 1,
  })
  const [saving, setSaving] = useState(false)
  const isSeries = entry.media_item?.media_type === 'series'

  const save = async () => {
    setSaving(true)
    try {
      await watchlistAPI.upsert({
        media_item_id: entry.media_item_id, status: form.status, rating: form.rating,
        review_notes: form.review_notes || null,
        date_watched: form.status === 'watched' && form.date_watched ? form.date_watched : null,
        current_season: form.current_season, current_episode: form.current_episode,
      })
      onSave(); onClose()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="card w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-white"><X size={18} /></button>
        <h3 className="font-display font-semibold mb-5 pr-6 text-base">{entry.media_item?.title}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-subtle mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {[['plan_to_watch','Plan to watch'],['watching','Watching'],['watched','Watched']].map(([v,l]) => (
                <button key={v} type="button" onClick={() => setForm(p => ({ ...p, status: v }))}
                  className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    form.status === v ? 'bg-accent/20 border-accent/40 text-accent-light' : 'border-border text-subtle hover:text-white')}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-subtle mb-2">Rating {form.rating ? `${form.rating}/10` : ''}</label>
            <StarRating value={form.rating} onChange={r => setForm(p => ({ ...p, rating: r }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-subtle mb-2">Notes</label>
            <textarea className="input resize-none h-20" value={form.review_notes}
              onChange={e => setForm(p => ({ ...p, review_notes: e.target.value }))} />
          </div>
          {form.status === 'watched' && (
            <div>
              <label className="block text-xs font-medium text-subtle mb-2">Date watched</label>
              <input type="date" className="input" value={form.date_watched}
                onChange={e => setForm(p => ({ ...p, date_watched: e.target.value }))} />
            </div>
          )}
          {isSeries && form.status === 'watching' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-subtle mb-2">Season</label>
                <input type="number" min={1} className="input" value={form.current_season}
                  onChange={e => setForm(p => ({ ...p, current_season: +e.target.value || 1 }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-subtle mb-2">Episode</label>
                <input type="number" min={1} className="input" value={form.current_episode}
                  onChange={e => setForm(p => ({ ...p, current_episode: +e.target.value || 1 }))} />
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center border border-border">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WatchlistPage() {
  const [params, setParams] = useSearchParams()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [editEntry, setEditEntry] = useState(null)
  const status = params.get('status') || ''
  const mtype  = params.get('type')   || ''

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await watchlistAPI.getAll({ status: status || undefined, type: mtype || undefined })
      setEntries(data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [status, mtype])

  const setFilter = (key, val) => {
    const next = new URLSearchParams(params)
    val ? next.set(key, val) : next.delete(key)
    setParams(next)
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove from your list?')) return
    await watchlistAPI.remove(id)
    setEntries(p => p.filter(e => e.id !== id))
  }

  const STATUSES = [['','All'],['plan_to_watch','Plan to watch'],['watching','Watching'],['watched','Watched']]
  const TYPES    = [['','All types'],['movie','Movies'],['series','Series']]

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="font-display font-semibold text-2xl mb-6">My List</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(([v,l]) => (
            <button key={v} onClick={() => setFilter('status', v)}
              className={clsx('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                status === v ? 'bg-accent/20 border-accent/40 text-accent-light' : 'border-border text-subtle hover:text-white')}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TYPES.map(([v,l]) => (
            <button key={v} onClick={() => setFilter('type', v)}
              className={clsx('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                mtype === v ? 'bg-accent/20 border-accent/40 text-accent-light' : 'border-border text-subtle hover:text-white')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="text-accent animate-spin" />
        </div>
      ) : entries.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted mb-4">{entries.length} item{entries.length !== 1 ? 's' : ''}</p>
          {entries.map(entry => {
            const m = entry.media_item
            const sc = { plan_to_watch: 'badge-plan', watching: 'badge-watching', watched: 'badge-watched' }[entry.status]
            const sl = { plan_to_watch: 'Plan to watch', watching: 'Watching', watched: 'Watched' }[entry.status]
            return (
              <div key={entry.id} className="card flex items-start gap-4 p-4 hover:border-accent/30 transition-colors">
                <div className="w-10 rounded-md overflow-hidden bg-surface shrink-0" style={{ height: 56 }}>
                  {m?.poster_path
                    ? <img src={m.poster_path} alt={m.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        {m?.media_type === 'movie' ? <Film size={14} className="text-border" /> : <Tv size={14} className="text-border" />}
                      </div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{m?.title}</span>
                    <span className={sc}>{sl}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span>{m?.media_type === 'movie' ? 'Movie' : 'Series'}</span>
                    {m?.release_date && <span>{m.release_date.split('-')[0]}</span>}
                    {entry.rating && <span className="flex items-center gap-1"><Star size={10} className="text-gold fill-gold" />{entry.rating}/10</span>}
                    {entry.status === 'watching' && m?.media_type === 'series' && <span>S{entry.current_season}E{entry.current_episode}</span>}
                  </div>
                  {entry.review_notes && <p className="text-xs text-subtle mt-1.5 line-clamp-2">{entry.review_notes}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setEditEntry(entry)} className="btn-ghost p-2" title="Edit"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(entry.id)} className="p-2 text-muted hover:text-red-400 transition-colors" title="Remove"><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <List size={36} className="text-border mx-auto mb-3" />
          <p className="font-medium mb-1">Nothing here</p>
          <p className="text-sm text-muted">{status ? `No items with status "${status.replace(/_/g,' ')}".` : 'Your list is empty.'}</p>
        </div>
      )}

      {editEntry && <EditModal entry={editEntry} onClose={() => setEditEntry(null)} onSave={load} />}
    </div>
  )
}
