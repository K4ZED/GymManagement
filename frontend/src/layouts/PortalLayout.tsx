import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, History, House, UserRound, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import { useI18n, type TKey } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { Preferences } from '@/components/Preferences'
import { Logo } from './AdminLayout'

type NavItem = { to: string; label: TKey; icon: LucideIcon }

const memberNav: NavItem[] = [
  { to: '/app', label: 'nav.home', icon: House },
  { to: '/app/schedule', label: 'nav.schedule', icon: CalendarDays },
  { to: '/app/history', label: 'nav.history', icon: History },
  { to: '/app/profile', label: 'nav.profile', icon: UserRound },
]

const trainerNav: NavItem[] = [
  { to: '/trainer', label: 'nav.myClasses', icon: CalendarDays },
  { to: '/trainer/profile', label: 'nav.profile', icon: UserRound },
]

/** Layout portal member & trainer: mobile-first dengan navigasi bawah; di layar lebar jadi kolom tengah. */
export default function PortalLayout() {
  const { t } = useI18n()
  const { user } = useAuth()
  const nav = user?.role === 'TRAINER' ? trainerNav : memberNav
  const root = nav[0].to

  return (
    <div className="mx-auto min-h-screen max-w-xl pb-24 md:pb-10">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-bg/90 px-4 backdrop-blur">
        <Logo />
        <nav className="hidden gap-4 md:flex">
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === root}
              className={({ isActive }) =>
                clsx('py-1 text-sm font-medium', isActive ? 'border-b-2 border-primary text-text' : 'text-muted hover:text-text')
              }
            >
              {t(label)}
            </NavLink>
          ))}
        </nav>
        <Preferences />
      </header>

      <main className="px-4 py-5">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto flex max-w-xl">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === root}
              className={({ isActive }) =>
                clsx(
                  'flex flex-1 flex-col items-center gap-1 border-t-2 pt-2 pb-2.5 text-[11px] font-semibold',
                  isActive ? 'border-primary text-text' : 'border-transparent text-muted',
                )
              }
            >
              <Icon size={20} strokeWidth={1.75} />
              {t(label)}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
