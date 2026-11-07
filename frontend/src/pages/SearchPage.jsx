import { useState, useRef, useCallback } from 'react'
import { mediaAPI, watchlistAPI } from '../lib/api'
import { Search, Film, Tv, Plus, Star, X, Check, Loader2 } from 'lucide-react'
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
          <Star size={17} fill={n <= (hov || value) ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

function AddModal({ item, onClose, onSuccess }) {
  const [form, setForm] = useState({ status: 'plan_to_watch', rating: null, review_notes: '', date_watched: '', current_season: 1, current_episode: 1 })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const isSeries = item.media_type === 'series'

  const save = async () => {
    setSaving(true); setError('')
    try {
      const mediaRes = await mediaAPI.addMedia({
        tmdb_id: item.tmdb_id ?? null, title: item.title, media_type: item.media_type,
        poster_path: item.poster_path ?? null, backdrop_path: item.backdrop_path ?? null,
        overview: item.overview ?? null, release_date: item.release_date ?? null, genres: item.genres ?? [],
      })
      await watchlistAPI.upsert({
        media_item_id: mediaRes.data.id, status: form.status, rating: form.rating,
        review_notes: form.review_notes || null,
        date_watched: form.status === 'watched' && form.date_watched ? form.date_watched : null,
        current_season: isSeries ? form.current_season : 1,
        current_episode: isSeries ? form.current_episode : 1,
      })
      onSuccess(); onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70">
      <div className="card w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-white"><X size={18} /></button>
        <div className="flex gap-4 mb-5">
          {item.poster_path
            ? <img src={item.poster_path} alt={item.title} className="w-14 h-20 object-cover rounded-lg shrink-0" />
            : <div className="w-14 h-20 bg-surface rounded-lg flex items-center justify-center shrink-0">
                {item.media_type === 'movie' ? <Film size={22} className="text-border" /> : <Tv size={22} className="text-border" />}
              </div>
          }
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-base leading-tight">{item.title}</h3>
            <p className="text-xs text-muted mt-1">{item.media_type === 'movie' ? 'Movie' : 'Series'} · {item.release_date?.split('-')[0] || '—'}</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-subtle mb-2">Status</label>
          <div className="flex gap-2 flex-wrap">
            {[['plan_to_watch','Plan to watch'],['watching','Watching'],['watched','Watched']].map(([v,l]) => (
              <button key={v} type="button" onClick={() => setForm(p => ({ ...p, status: v }))}
                className={clsx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                  form.status === v ? 'bg-accent/20 border-accent/40 text-accent-light' : 'border-border text-subtle hover:text-white')}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-subtle mb-2">Rating {form.rating ? `(${form.rating}/10)` : '(optional)'}</label>
          <StarRating value={form.rating} onChange={r => setForm(p => ({ ...p, rating: r }))} />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-subtle mb-2">Notes (optional)</label>
          <textarea className="input resize-none h-20" placeholder="Your thoughts..."
            value={form.review_notes} onChange={e => setForm(p => ({ ...p, review_notes: e.target.value }))} />
        </div>

        {form.status === 'watched' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-subtle mb-2">Date watched</label>
            <input type="date" className="input" value={form.date_watched}
              onChange={e => setForm(p => ({ ...p, date_watched: e.target.value }))} />
          </div>
        )}

        {isSeries && form.status === 'watching' && (
          <div className="mb-4 grid grid-cols-2 gap-3">
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

        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center border border-border">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  const [query, setQuery]     = useState('')
  const [type, setType]       = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState(null)
  const debounceRef = useRef(null)

  const doSearch = useCallback(async (q, t) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    try {
      const { data } = await mediaAPI.search(q, t)
      setResults(Array.isArray(data.results) ? data.results : [])
      setSearched(true)
    } catch { setResults([]) } finally { setLoading(false) }
  }, [])

  const handleInput = (e) => {
    const q = e.target.value; setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q, type), 400)
  }

  const handleType = (t) => { setType(t); doSearch(query, t) }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <h1 className="font-display font-semibold text-2xl mb-6">Search</h1>

      <div className="relative mb-4">
        <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input type="text" className="input pl-10" placeholder="Search movies and series..." value={query} onChange={handleInput} autoFocus />
        {loading && <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted animate-spin" />}
      </div>

      <div className="flex gap-2 mb-6">
        {[['','All'],['movie','Movies'],['series','Series']].map(([v,l]) => (
          <button key={v} onClick={() => handleType(v)}
            className={clsx('px-4 py-1.5 rounded-full text-sm font-medium border transition-all',
              type === v ? 'bg-accent/20 border-accent/40 text-accent-light' : 'border-border text-subtle hover:text-white')}>
            {l}
          </button>
        ))}
      </div>

      {results.length > 0 ? (
        <div className="space-y-3">
          {results.map((r, i) => (
            <div key={r.tmdb_id ?? r.id ?? i} className="card flex items-start gap-4 p-4 hover:border-accent/30 transition-colors">
              <div className="w-12 h-18 rounded-lg overflow-hidden bg-surface shrink-0" style={{ height: 68 }}>
                {r.poster_path
                  ? <img src={r.poster_path} alt={r.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center">
                      {r.media_type === 'movie' ? <Film size={18} className="text-border" /> : <Tv size={18} className="text-border" />}
                    </div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <h3 className="font-medium text-sm leading-snug flex-1">{r.title}</h3>
                  <span className={clsx('badge shrink-0', r.media_type === 'movie' ? 'badge-plan' : 'badge-watching')}>
                    {r.media_type === 'movie' ? 'Movie' : 'Series'}
                  </span>
                </div>
                {r.release_date && <p className="text-xs text-muted mt-1">{r.release_date.split('-')[0]}</p>}
                {r.overview && <p className="text-xs text-subtle mt-1.5 line-clamp-2 leading-relaxed">{r.overview}</p>}
              </div>
              <button onClick={() => setSelected(r)} className="btn-primary shrink-0 self-center px-3 py-2">
                <Plus size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : searched && !loading ? (
        <div className="text-center py-16 text-muted">
          <Search size={36} className="mx-auto mb-3 text-border" />
          <p className="font-medium">No results</p>
          <p className="text-sm mt-1">Try a different title or filter.</p>
        </div>
      ) : !searched && (
        <div className="text-center py-16 text-muted">
          <Film size={36} className="mx-auto mb-3 text-border" />
          <p>Type above to find movies and series.</p>
        </div>
      )}

      {selected && <AddModal item={selected} onClose={() => setSelected(null)} onSuccess={() => {}} />}
    </div>
  )
}
