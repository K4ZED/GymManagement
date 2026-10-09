import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '@/api'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@/lib/useQuery'
import { daysUntil } from '@/lib/format'
import { EmptyState, QueryView } from '@/components/ui'

export default function MemberHomePage() {
  const { t, date, time } = useI18n()
  const { user } = useAuth()
  const member = user?.member
  const upcoming = useQuery(() => api.bookings.list({ upcoming: true, status: 'BOOKED', limit: 5 }))
  if (!member) return null
  const ms = member.activeMembership

  return (
    <div className="space-y-6">
      <h1 className="display text-4xl">{t('portal.hello', { name: member.name.split(' ')[0] })}</h1>

      {/* Kartu member: dipakai untuk check-in di meja depan */}
      <div className="bg-ink p-5 text-ink-fg">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow text-ink-fg! opacity-60">{t('portal.membership')}</p>
            {ms ? (
              <>
                <p className="display mt-1 text-4xl">{ms.plan.name}</p>
                <p className="mt-1 text-sm opacity-70">
                  {t('member.validUntil')} {date(ms.endDate)}
                </p>
                <p className={`display mt-3 text-2xl ${daysUntil(ms.endDate) <= 7 ? 'text-primary' : ''}`}>{t('member.daysLeft', { n: daysUntil(ms.endDate) })}</p>
              </>
            ) : (
              <>
                <p className="display mt-1 text-3xl text-primary">{t('portal.inactive')}</p>
                <p className="mt-1 text-sm opacity-70">{t('portal.renewHint')}</p>
              </>
            )}
          </div>
          <div className="shrink-0 bg-white p-2">
            <QRCodeSVG value={member.memberCode} size={104} />
          </div>
        </div>
        <div className="mt-5 flex items-end justify-between border-t border-ink-fg/20 pt-3">
          <p className="font-mono text-lg tracking-wider">{member.memberCode}</p>
          <p className="max-w-[45%] text-right text-[11px] opacity-60">{t('portal.showQr')}</p>
        </div>
      </div>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="eyebrow">{t('portal.upcoming')}</h2>
          <Link to="/app/schedule" className="text-xs font-semibold text-muted hover:text-text">
            {t('nav.schedule')}
          </Link>
        </div>
        <div className="border bg-surface">
          <QueryView query={upcoming}>
            {({ data }) =>
              data.length === 0 ? (
                <EmptyState message={t('portal.noUpcoming')} />
              ) : (
                <ul className="divide-y">
                  {data.map((b) => (
                    <li key={b.id} className="flex items-center gap-4 px-4 py-3">
                      <div className="w-14 shrink-0 text-center">
                        <p className="eyebrow">{date(b.session.startAt, { weekday: 'short' })}</p>
                        <p className="display text-2xl">{date(b.session.startAt, { day: 'numeric' })}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{b.session.name}</p>
                        <p className="truncate text-xs text-muted">
                          {time(b.session.startAt)}, {b.session.trainer.name}
                          {b.session.room && `, ${b.session.room}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            }
          </QueryView>
        </div>
      </section>
    </div>
  )
}
