import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import clsx from 'clsx'
import { useI18n, type TKey } from '@/i18n'
import { useAuth } from '@/lib/auth'
import type { Role } from '@/types'
import { IconButton } from '@/components/ui'
import { Preferences } from '@/components/Preferences'

const nav: { to: string; label: TKey; roles?: Role[] }[] = [
  { to: '/admin', label: 'nav.dashboard' },
  { to: '/admin/checkin', label: 'nav.checkin' },
  { to: '/admin/members', label: 'nav.members' },
  { to: '/admin/classes', label: 'nav.classes' },
  { to: '/admin/plans', label: 'nav.plans' },
  { to: '/admin/trainers', label: 'nav.trainers' },
  { to: '/admin/users', label: 'nav.users', roles: ['ADMIN'] },
]

export function Logo() {
  const { t } = useI18n()
  return (
    <span className="flex items-center gap-2">
      <span className="display flex h-7 items-center bg-ink px-1.5 text-lg text-ink-fg">{t('app.short')}</span>
      <span className="display text-lg">{t('app.name')}</span>
    </span>
  )
}

export function UserBlock() {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  if (!user) return null
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{user.name}</p>
        <p className="eyebrow">{t(`role.${user.role}`)}</p>
      </div>
      <IconButton label={t('auth.logout')} onClick={logout}>
        <LogOut size={17} />
      </IconButton>
    </div>
  )
}

export default function AdminLayout() {
  const { t } = useI18n()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setOpen(false), [location.pathname])

  const items = nav.filter((n) => !n.roles || (user && n.roles.includes(user.role)))

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Logo />
        <IconButton label={t('common.close')} className="lg:hidden" onClick={() => setOpen(false)}>
          <X size={18} />
        </IconButton>
      </div>
      <nav className="flex-1 py-3">
        {items.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin'}
            className={({ isActive }) =>
              clsx(
                'mx-2 flex items-center rounded-md px-3 py-2 text-sm transition',
                isActive ? 'bg-surface-2 font-semibold text-text' : 'text-muted hover:bg-surface-2 hover:text-text',
              )
            }
          >
            {t(label)}
          </NavLink>
        ))}
      </nav>
      <div className="border-t p-3 pl-4">
        <UserBlock />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:pl-56">
      <aside className="fixed inset-y-0 left-0 hidden w-56 border-r bg-surface lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/55" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 max-w-[85vw] border-r bg-surface">{sidebar}</aside>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-bg/90 px-4 backdrop-blur sm:px-6">
        <IconButton label="Menu" className="-ml-2 lg:hidden" onClick={() => setOpen(true)}>
          <Menu size={20} />
        </IconButton>
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="flex-1" />
        <Preferences />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <Outlet />
      </main>
    </div>
  )
}
