import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Film, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate     = useNavigate()
  const [form, setForm]       = useState({ email: '', username: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('')
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      await register(form.email, form.username, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8">
          <Film size={20} className="text-accent" />
          <span className="font-display font-semibold text-lg">Cinetrack</span>
        </div>

        <h2 className="font-display font-semibold text-2xl mb-1">Create your account</h2>
        <p className="text-muted text-sm mb-8">Start tracking your watch history for free.</p>

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
            <label className="block text-xs font-medium text-subtle mb-1.5">Username</label>
            <input className="input" type="text" placeholder="cinephile42" minLength={3} maxLength={30}
              value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs font-medium text-subtle mb-1.5">Password</label>
            <div className="relative">
              <input className="input pr-10" type={showPw ? 'text' : 'password'}
                placeholder="Minimum 8 characters" minLength={8}
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-subtle">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full justify-center mt-2" disabled={loading}>
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Create account'}
          </button>
        </form>

        <p className="text-xs text-subtle text-center mt-4 leading-relaxed">
          By creating an account you agree to our{' '}
          <a href="#" className="underline underline-offset-2 hover:text-muted">Terms of Service</a> and{' '}
          <a href="#" className="underline underline-offset-2 hover:text-muted">Privacy Policy</a>.
          Your data is encrypted and never sold.
        </p>

        <div className="flex items-center gap-2 text-xs text-subtle mt-4 p-3 bg-green-500/5 border border-green-500/15 rounded-lg">
          <Shield size={13} className="text-green-400 shrink-0" />
          Passwords are hashed with bcrypt. We never store plain text credentials.
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-light hover:text-accent transition-colors">Sign in</Link>
        </p>
        <p className="text-center text-xs text-subtle/60 mt-4">© 2026 Cinetrack. All rights reserved.</p>
      </div>
    </div>
  )
}
