import { useState } from 'react'
import { api } from '@/api'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@/lib/useQuery'
import { EmptyState, Pagination, QueryView, Segmented } from '@/components/ui'
import { BookingTag, MembershipTag } from '@/components/status'

type Tab = 'checkins' | 'bookings' | 'memberships'

export default function MemberHistoryPage() {
  const { t, date, time, money } = useI18n()
  const { user } = useAuth()
  const memberId = user?.member?.id ?? ''
  const [tab, setTab] = useState<Tab>('checkins')
  const [page, setPage] = useState(1)

  const checkins = useQuery(() => (tab === 'checkins' ? api.checkins.list({ page, limit: 20 }) : Promise.resolve(null)), [tab, page])
  const bookings = useQuery(() => (tab === 'bookings' ? api.bookings.list({ page, limit: 20 }) : Promise.resolve(null)), [tab, page])
  const memberships = useQuery(() => (tab === 'memberships' ? api.members.memberships(memberId) : Promise.resolve(null)), [tab, memberId])

  return (
    <div className="space-y-5">
      <h1 className="display text-4xl">{t('nav.history')}</h1>
      <div className="overflow-x-auto">
        <Segmented<Tab>
          value={tab}
          onChange={(v) => {
            setTab(v)
            setPage(1)
          }}
          options={[
            { value: 'checkins', label: t('nav.checkin') },
            { value: 'bookings', label: t('member.bookings') },
            { value: 'memberships', label: t('portal.membership') },
          ]}
        />
      </div>

      <div className="border bg-surface">
        {tab === 'checkins' && (
          <QueryView query={checkins}>
            {(res) =>
              !res || res.data.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <ul className="divide-y">
                    {res.data.map((c) => (
                      <li key={c.id} className="flex justify-between px-4 py-2.5 text-sm">
                        <span>{date(c.checkedInAt, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                        <span className="font-mono text-xs text-muted">{time(c.checkedInAt)}</span>
                      </li>
                    ))}
                  </ul>
                  <Pagination meta={res.meta} onPage={setPage} />
                </>
              )
            }
          </QueryView>
        )}

        {tab === 'bookings' && (
          <QueryView query={bookings}>
            {(res) =>
              !res || res.data.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <ul className="divide-y">
                    {res.data.map((b) => (
                      <li key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{b.session.name}</p>
                          <p className="font-mono text-xs text-muted">
                            {date(b.session.startAt, { day: 'numeric', month: 'short' })} {time(b.session.startAt)} · {b.session.trainer.name}
                          </p>
                        </div>
                        <BookingTag status={b.status} />
                      </li>
                    ))}
                  </ul>
                  <Pagination meta={res.meta} onPage={setPage} />
                </>
              )
            }
          </QueryView>
        )}

        {tab === 'memberships' && (
          <QueryView query={memberships}>
            {(list) =>
              !list || list.length === 0 ? (
                <EmptyState />
              ) : (
                <ul className="divide-y">
                  {list.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{m.plan.name}</p>
                        <p className="font-mono text-xs text-muted">
                          {date(m.startDate)} – {date(m.endDate)} · {money(m.price)}
                        </p>
                      </div>
                      <MembershipTag status={m.status} />
                    </li>
                  ))}
                </ul>
              )
            }
          </QueryView>
        )}
      </div>
    </div>
  )
}
