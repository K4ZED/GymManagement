import { useState } from 'react'
import { api } from '@/api'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@/lib/useQuery'
import { addDays, toDateStr, todayStr } from '@/lib/format'
import { EmptyState, QueryView } from '@/components/ui'
import { ClassTag } from '@/components/status'
import { ClassDetailModal } from '@/components/ClassModals'

/** Portal trainer: kelas 14 hari ke depan, buka untuk lihat peserta & tandai hadir */
export default function TrainerClassesPage() {
  const { t, date, time } = useI18n()
  const { user } = useAuth()
  const trainerId = user?.trainer?.id
  const today = todayStr()
  const query = useQuery(
    () => api.classes.list({ trainerId, from: new Date(today + 'T00:00:00').toISOString(), to: new Date(addDays(today, 14) + 'T00:00:00').toISOString() }),
    [trainerId, today],
  )
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="space-y-5">
      <h1 className="display text-3xl">{t('nav.myClasses')}</h1>

      <QueryView query={query}>
        {(sessions) => {
          if (sessions.length === 0) return <EmptyState message={t('class.noClasses')} />
          const byDay = new Map<string, typeof sessions>()
          for (const s of sessions) {
            const d = toDateStr(new Date(s.startAt))
            byDay.set(d, [...(byDay.get(d) ?? []), s])
          }
          return (
            <div className="space-y-5">
              {[...byDay.entries()].map(([d, items]) => (
                <section key={d}>
                  <h2 className="eyebrow mb-2">
                    {d === today ? t('common.today') : date(d, { weekday: 'long' })}, {date(d, { day: 'numeric', month: 'short' })}
                  </h2>
                  <ul className="divide-y border bg-surface">
                    {items.map((s) => (
                      <li key={s.id}>
                        <button type="button" onClick={() => setOpenId(s.id)} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-surface-2">
                          <span className="display w-12 shrink-0 text-xl">{time(s.startAt)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{s.name}</p>
                            <p className="text-xs text-muted">
                              {t('class.slots', { booked: s.bookedCount, capacity: s.capacity })}
                              {s.room && `, ${s.room}`}
                            </p>
                          </div>
                          <ClassTag status={s.status} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )
        }}
      </QueryView>

      <ClassDetailModal sessionId={openId} onClose={() => setOpenId(null)} onChanged={query.reload} />
    </div>
  )
}
