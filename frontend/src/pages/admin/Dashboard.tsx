import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api'
import { useI18n } from '@/i18n'
import { useQuery } from '@/lib/useQuery'
import { addDays, daysUntil, todayStr } from '@/lib/format'
import { EmptyState, PageHeader, Panel, QueryView, Tag } from '@/components/ui'
import { ClassTag } from '@/components/status'
import { SimpleBarChart } from '@/components/SimpleBarChart'

export default function DashboardPage() {
  const { t, money, num, date, time } = useI18n()
  const today = todayStr()
  const query = useQuery(() =>
    Promise.all([
      api.dashboard.summary(),
      api.dashboard.expiring(7),
      api.classes.list({ from: new Date(today + 'T00:00:00').toISOString(), to: new Date(addDays(today, 1) + 'T00:00:00').toISOString(), includeCancelled: true }),
    ]),
  )

  return (
    <>
      <PageHeader title={t('dashboard.title')} meta={date(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
      <QueryView query={query}>
        {([s, expiring, classes]) => (
          <div className="space-y-6">
            {/* Deret angka utama: satu blok bergaris, bukan kartu ikon */}
            <div className="grid grid-cols-2 border-t border-l bg-surface md:grid-cols-3">
              <Kpi label={t('dashboard.activeMembers')} value={num(s.activeMembers)} note={t('dashboard.ofTotal', { n: s.totalMembers })} />
              <Kpi label={t('dashboard.checkInsToday')} value={num(s.checkInsToday)} accent />
              <Kpi label={t('dashboard.classesToday')} value={num(s.classesToday)} />
              <Kpi label={t('dashboard.expiring')} value={num(s.expiringIn7Days)} />
              <Kpi label={t('dashboard.newMembers')} value={num(s.newMembersThisMonth)} />
              <Kpi label={t('dashboard.revenue')} value={money(s.membershipRevenueThisMonth)} small />
            </div>

            <div className="grid gap-6 lg:grid-cols-5">
              <Panel title={t('dashboard.checkInChart')} className="lg:col-span-3">
                <SimpleBarChart
                  data={s.checkInsLast7Days.map((d) => ({ label: date(d.date, { weekday: 'short', day: 'numeric' }), value: d.count }))}
                  format={num}
                  highlightIndex={s.checkInsLast7Days.length - 1}
                />
              </Panel>

              <Panel title={t('dashboard.expiringList')} className="lg:col-span-2" flush action={<ViewAll to="/admin/members" />}>
                {expiring.length === 0 ? (
                  <EmptyState message={t('dashboard.noExpiring')} />
                ) : (
                  <ul className="divide-y">
                    {expiring.slice(0, 7).map((m) => (
                      <li key={m.id}>
                        <Link to={`/admin/members/${m.member.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{m.member.name}</p>
                            <p className="font-mono text-xs text-muted">
                              {m.member.memberCode}, {m.plan.name}
                            </p>
                          </div>
                          <Tag tone={daysUntil(m.endDate) <= 3 ? 'danger' : 'warning'}>{t('member.daysLeft', { n: daysUntil(m.endDate) })}</Tag>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel title={t('dashboard.todayClasses')} flush action={<ViewAll to="/admin/classes" />}>
              {classes.length === 0 ? (
                <EmptyState message={t('class.noClasses')} />
              ) : (
                <ul className="divide-y">
                  {classes.map((c) => (
                    <li key={c.id} className="flex items-center gap-4 px-4 py-3">
                      <span className="display w-24 shrink-0 text-xl">
                        {time(c.startAt)}
                        <span className="text-muted">-{time(c.endAt)}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <p className="truncate text-xs text-muted">
                          {c.trainer.name}
                          {c.room && `, ${c.room}`}
                        </p>
                      </div>
                      <span className="hidden font-mono text-xs text-muted sm:inline">{t('class.slots', { booked: c.bookedCount, capacity: c.capacity })}</span>
                      <ClassTag status={c.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}
      </QueryView>
    </>
  )
}

function Kpi({ label, value, note, accent, small }: { label: string; value: ReactNode; note?: string; accent?: boolean; small?: boolean }) {
  return (
    <div className="border-r border-b px-4 py-4 sm:px-5">
      <p className="eyebrow">{label}</p>
      <p className={`display mt-2 ${small ? 'text-3xl sm:text-4xl' : 'text-5xl'} ${accent ? 'text-primary' : ''}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  )
}

function ViewAll({ to }: { to: string }) {
  const { t } = useI18n()
  return (
    <Link to={to} className="text-xs font-semibold text-muted hover:text-text">
      {t('common.viewAll')}
    </Link>
  )
}
