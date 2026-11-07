import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Film, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      {/* Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-surface items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/20 via-transparent to-transparent" />
        <div className="relative z-10 max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl mb-6 shadow-accent">
            <Film size={28} className="text-white" />
          </div>
          <h1 className="font-display font-semibold text-4xl mb-4 leading-tight">
            Every frame<br />accounted for.
          </h1>
          <p className="text-subtle leading-relaxed">
            Track what you've watched, what you're watching, and what's next — with ratings, notes, and series progress tracking.
          </p>
          <div className="mt-8 flex items-center gap-2 text-xs text-subtle justify-center">
            <Shield size={13} className="text-green-400" />
            <span>256-bit TLS · bcrypt passwords · JWT auth</span>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Film size={20} className="text-accent" />
            <span className="font-display font-semibold text-lg">Cinetrack</span>
          </div>

          <h2 className="font-display font-semibold text-2xl mb-1">Welcome back</h2>
          <p className="text-muted text-sm mb-8">Sign in to your account to continue.</p>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 mb-5">
              <AlertCircle size={15} className="shrink-0" />{error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-subtle mb-1.5">Email address</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-subtle mb-1.5">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPw ? 'text' : 'password'}
                  placeholder="••••••••" value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-subtle">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full justify-center mt-2" disabled={loading}>
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : 'Sign in'}
            </button>
          </form>

          <div className="flex items-center gap-2 text-xs text-subtle mt-5 p-3 bg-green-500/5 border border-green-500/15 rounded-lg">
            <Shield size={13} className="text-green-400 shrink-0" />
            Your data is encrypted in transit and at rest. Passwords are hashed with bcrypt and never stored in plain text.
          </div>

          <p className="text-center text-sm text-muted mt-6">
            No account? <Link to="/register" className="text-accent-light hover:text-accent transition-colors">Create one</Link>
          </p>

          <div className="flex justify-center gap-4 mt-6">
            {['Privacy Policy', 'Terms of Service', 'Help'].map(l => (
              <a key={l} href="#" className="text-xs text-subtle hover:text-muted transition-colors">{l}</a>
            ))}
          </div>
          <p className="text-center text-xs text-subtle/60 mt-3">
            © 2026 Cinetrack. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
