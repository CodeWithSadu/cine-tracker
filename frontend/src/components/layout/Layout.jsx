import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { LayoutDashboard, Search, List, BarChart2, LogOut, Film, Menu, X } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/search',     icon: Search,          label: 'Search'     },
  { to: '/watchlist',  icon: List,            label: 'My List'    },
  { to: '/analytics',  icon: BarChart2,       label: 'Analytics'  },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const [open, setOpen]  = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {open && (
        <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={clsx(
        'fixed inset-y-0 left-0 z-30 w-64 bg-surface border-r border-border flex flex-col',
        'transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shrink-0">
            <Film size={16} className="text-white" />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Cinetrack</span>
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden text-muted hover:text-white">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-accent/15 text-accent-light border border-accent/20'
                  : 'text-subtle hover:text-white hover:bg-card'
              )}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
              <span className="text-accent-light text-sm font-semibold">
                {user?.username?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-muted truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="btn-ghost w-full text-sm justify-start">
            <LogOut size={15} />Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-4 border-b border-border bg-surface">
          <button onClick={() => setOpen(true)} className="text-subtle hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Film size={18} className="text-accent" />
            <span className="font-display font-semibold">Cinetrack</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-canvas">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
