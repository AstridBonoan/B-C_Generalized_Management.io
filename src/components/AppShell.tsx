import { useMemo, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  Users,
  UsersRound,
  Activity,
  BarChart3,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { canViewModule } from '../lib/permissions'
import type { ModuleKey } from '../types/domain'
import { BrandLogo } from './BrandLogo'
import { Button, Input } from './ui'

const NAV: Array<{ to: string; label: string; module: ModuleKey; icon: typeof LayoutDashboard }> = [
  { to: '/', label: 'Dashboard', module: 'dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', module: 'clients', icon: Building2 },
  { to: '/leads', label: 'Leads', module: 'leads', icon: UsersRound },
  { to: '/tasks', label: 'Tasks', module: 'tasks', icon: ClipboardList },
  { to: '/projects', label: 'Projects', module: 'projects', icon: FolderKanban },
  { to: '/appointments', label: 'Appointments', module: 'appointments', icon: Calendar },
  { to: '/documents', label: 'Documents', module: 'documents', icon: FileText },
  { to: '/activity', label: 'Activity', module: 'activity', icon: Activity },
  { to: '/reports', label: 'Reports', module: 'reports', icon: BarChart3 },
  { to: '/users', label: 'Users', module: 'users', icon: Users },
  { to: '/settings/roles', label: 'Roles', module: 'roles', icon: Shield },
  { to: '/settings', label: 'Settings', module: 'settings', icon: Settings },
]

export function AppShell() {
  const { store, profile, demoMode, refresh } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const unread = store.state.notifications.filter((item) => item.recipientId === profile?.id && !item.readAt).length
  const items = NAV.filter((item) => canViewModule(store.state, profile, item.module))
  const results = useMemo(() => (query.trim().length > 1 ? store.globalSearch(query, 5) : null), [query, store])

  return (
    <div className="min-h-svh bg-paper lg:grid lg:grid-cols-[280px_1fr]">
      <aside className={`brand-panel fixed inset-y-0 left-0 z-40 w-[280px] text-white transition lg:static ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-2 px-4 py-5">
            <a href="https://www.bcsoftwareweb.com/" target="_blank" rel="noreferrer" className="block min-w-0">
              <BrandLogo variant="onDark" className="h-14 w-auto max-w-[200px] object-contain object-left" />
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">General Management</p>
            </a>
            <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
              <X />
            </button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
            {items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/' || item.to === '/settings'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`
                  }
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>
          <div className="border-t border-white/10 px-4 py-4 text-xs text-slate-400">
            <a className="text-gold hover:underline" href="https://www.bcsoftwareweb.com/" target="_blank" rel="noreferrer">
              bcsoftwareweb.com
            </a>
          </div>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-line bg-card/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <button className="rounded-md p-2 hover:bg-paper-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu />
            </button>
            <div className="relative min-w-0 flex-1 sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-soft" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search records"
                aria-label="Search records"
                className="pl-9"
              />
              {results ? (
                <div className="absolute z-20 mt-1 w-full rounded-lg border border-line bg-card p-2 text-sm shadow-lg">
                  {(['clients', 'leads', 'projects', 'tasks', 'users'] as const).map((group) => (
                    <div key={group}>
                      {results[group].length ? <p className="px-2 pt-1 text-xs uppercase text-ink-soft">{group}</p> : null}
                      {results[group].map((item) => {
                        const label = 'displayName' in item ? item.displayName : 'fullName' in item ? item.fullName : 'title' in item ? item.title : 'name' in item ? item.name : ''
                        const to =
                          group === 'clients'
                            ? `/clients/${item.id}`
                            : group === 'leads'
                              ? '/leads'
                              : group === 'projects'
                                ? `/projects/${item.id}`
                                : group === 'tasks'
                                  ? '/tasks'
                                  : `/users/${item.id}`
                        return (
                          <button
                            key={item.id}
                            className="block w-full rounded px-2 py-1 text-left hover:bg-paper-2"
                            onClick={() => {
                              setQuery('')
                              navigate(to)
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {demoMode ? <span className="rounded-full bg-gold-soft px-2 py-1 text-xs font-semibold text-teal-deep">Demo mode</span> : null}
            <Button variant="ghost" type="button" onClick={() => navigate('/notifications')} aria-label="Notifications">
              <Bell size={18} />
              {unread ? <span className="rounded-full bg-gold px-1.5 text-xs text-white">{unread}</span> : null}
            </Button>
            <button className="rounded-md px-2 text-left text-sm" onClick={() => navigate('/profile')}>
              <span className="block font-semibold">{profile?.fullName}</span>
              <span className="text-xs text-ink-soft">{profile?.email}</span>
            </button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                store.logout()
                refresh()
                navigate('/login')
              }}
            >
              <LogOut size={18} />
              Log out
            </Button>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
