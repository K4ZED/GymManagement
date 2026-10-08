import { useState } from 'react'
import clsx from 'clsx'
import { api } from '@/api'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@/lib/useQuery'
import { useToast } from '@/lib/toast'
import { addDays, toDateStr, todayStr } from '@/lib/format'
import type { ClassSession } from '@/types'
import { Button, EmptyState, QueryView, Tag } from '@/components/ui'

export default function MemberSchedulePage() {
  const { t, tError, date, time } = useI18n()
  const { user } = useAuth()
  const toast = useToast()
  const today = todayStr()
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const [day, setDay] = useState(today)
  // Ambil 7 hari sekaligus, filter per hari di klien
  const query = useQuery(() => api.classes.list({ from: new Date(today + 'T00:00:00').toISOString(), to: new Date(addDays(today, 7) + 'T00:00:00').toISOString() }), [today])
  const [busyId, setBusyId] = useState<string | null>(null)
  const hasMembership = !!user?.member?.activeMembership

  async function toggle(s: ClassSession) {
    setBusyId(s.id)
    try {
      if (s.myBooking?.status === 'BOOKED') {
        await api.bookings.cancel(s.myBooking.id)
        toast(t('class.cancelSuccess'))
      } else {
        await api.classes.book(s.id)
        toast(t('class.bookSuccess'))
      }
      query.reload()
    } catch (err) {
      toast(tError(err), 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="display text-4xl">{t('nav.schedule')}</h1>

      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(d)}
            aria-pressed={day === d}
            className={clsx('flex w-14 shrink-0 flex-col items-center border py-2 transition', day === d ? 'border-ink bg-ink text-ink-fg' : 'bg-surface hover:bg-surface-2')}
          >
            <span className="text-[11px] font-semibold uppercase opacity-70">{date(d, { weekday: 'short' })}</span>
            <span className="display text-2xl">{date(d, { day: 'numeric' })}</span>
          </button>
        ))}
      </div>

      {!hasMembership && <p className="border-l-2 border-warning bg-warning-soft px-3 py-2 text-sm text-warning">{t('errors.NO_ACTIVE_MEMBERSHIP')}</p>}

      <QueryView query={query}>
        {(sessions) => {
          const items = sessions.filter((s) => toDateStr(new Date(s.startAt)) === day)
          if (items.length === 0) return <EmptyState message={t('class.noClasses')} />
          return (
            <ul className="divide-y border bg-surface">
              {items.map((s) => {
                const mine = s.myBooking?.status
                const canBook = s.status === 'SCHEDULED' && s.availableSlots > 0 && hasMembership
                return (
                  <li key={s.id} className="flex gap-4 px-4 py-3">
                    <div className="w-12 shrink-0">
                      <p className="display text-xl">{time(s.startAt)}</p>
                      <p className="font-mono text-[11px] text-muted">{time(s.endAt)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{s.name}</p>
                      <p className="truncate text-xs text-muted">
                        {s.trainer.name}
                        {s.room && ` · ${s.room}`}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-muted">{s.availableSlots > 0 ? t('class.slotsLeft', { n: s.availableSlots }) : t('class.full')}</p>
                    </div>
                    <div className="flex shrink-0 items-center">
                      {mine === 'ATTENDED' ? (
                        <Tag tone="success">{t('class.attended')}</Tag>
                      ) : s.status !== 'SCHEDULED' ? (
                        <Tag>{t(`class.status.${s.status}`)}</Tag>
                      ) : mine === 'BOOKED' ? (
                        <Button size="sm" variant="secondary" loading={busyId === s.id} onClick={() => toggle(s)}>
                          {t('class.cancelBooking')}
                        </Button>
                      ) : (
                        <Button size="sm" disabled={!canBook} loading={busyId === s.id} onClick={() => toggle(s)}>
                          {s.availableSlots > 0 ? t('class.book') : t('class.full')}
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        }}
      </QueryView>
    </div>
  )
}
