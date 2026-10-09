import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '@/api'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@/lib/useQuery'
import { useToast } from '@/lib/toast'
import { daysUntil } from '@/lib/format'
import { Button, EmptyState, Panel, QueryView, Table, Td } from '@/components/ui'
import { BookingTag, MembershipTag, MemberTag } from '@/components/status'
import { MemberFormModal, MembershipModal } from '@/components/MemberModals'

export default function MemberDetailPage() {
  const { id = '' } = useParams()
  const { t, tError, date, time, money } = useI18n()
  const { user } = useAuth()
  const toast = useToast()
  const query = useQuery(
    () =>
      Promise.all([
        api.members.get(id),
        api.members.memberships(id),
        api.checkins.list({ memberId: id, limit: 12 }),
        api.bookings.list({ memberId: id, limit: 10 }),
      ]),
    [id],
  )
  const [editing, setEditing] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>) {
    if (!confirm(t('common.confirm'))) return
    setBusy(true)
    try {
      await action()
      toast(t('common.saved'))
      query.reload()
    } catch (err) {
      toast(tError(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Link to="/admin/members" className="eyebrow mb-4 inline-block hover:text-text">
        {t('member.backToList')}
      </Link>
      <QueryView query={query}>
        {([member, memberships, checkins, bookings]) => {
          const active = member.activeMembership
          return (
            <div className="space-y-6">
              {/* Kepala: identitas + aksi */}
              <div className="flex flex-col gap-5 border-b pb-6 md:flex-row md:items-end">
                <div className="flex-1">
                  <p className="font-mono text-sm text-muted">{member.memberCode}</p>
                  <h1 className="display mt-1 text-5xl sm:text-6xl">{member.name}</h1>
                  <div className="mt-3">
                    <MemberTag member={member} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="accent" disabled={!member.isActive} onClick={() => setRenewing(true)}>
                    {active ? t('member.renew') : t('member.register')}
                  </Button>
                  <Button variant="secondary" onClick={() => setEditing(true)}>
                    {t('common.edit')}
                  </Button>
                  <Button variant={member.isActive ? 'danger' : 'secondary'} disabled={busy} onClick={() => run(() => api.members.update(member.id, { isActive: !member.isActive }))}>
                    {member.isActive ? t('common.deactivate') : t('common.activate')}
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6">
                  <Panel title={t('portal.membership')}>
                    {active ? (
                      <div>
                        <p className="display text-3xl">{active.plan.name}</p>
                        <p className="mt-1 text-sm text-muted">
                          {date(active.startDate)} - {date(active.endDate)}
                        </p>
                        <p className={`display mt-4 text-3xl ${daysUntil(active.endDate) <= 7 ? 'text-warning' : ''}`}>
                          {t('member.daysLeft', { n: daysUntil(active.endDate) })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted">{t('member.noMembership')}</p>
                    )}
                  </Panel>

                  <Panel>
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2">
                        <QRCodeSVG value={member.memberCode} size={96} />
                      </div>
                      <dl className="min-w-0 space-y-2 text-sm">
                        <div>
                          <dt className="eyebrow">{t('member.email')}</dt>
                          <dd className="truncate">{member.email}</dd>
                        </div>
                        <div>
                          <dt className="eyebrow">{t('member.phone')}</dt>
                          <dd>{member.phone ?? '-'}</dd>
                        </div>
                      </dl>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm">
                      <div>
                        <dt className="eyebrow">{t('member.gender')}</dt>
                        <dd>{member.gender ? t(`member.gender.${member.gender}`) : '-'}</dd>
                      </div>
                      <div>
                        <dt className="eyebrow">{t('member.birthDate')}</dt>
                        <dd>{date(member.birthDate)}</dd>
                      </div>
                      <div>
                        <dt className="eyebrow">{t('member.joinedAt')}</dt>
                        <dd>{date(member.joinedAt)}</dd>
                      </div>
                      <div>
                        <dt className="eyebrow">{t('member.emergencyContact')}</dt>
                        <dd>{member.emergencyContact ?? '-'}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="eyebrow">{t('member.address')}</dt>
                        <dd>{member.address ?? '-'}</dd>
                      </div>
                    </dl>
                  </Panel>
                </div>

                <div className="space-y-6 lg:col-span-2">
                  <Panel title={t('member.memberships')} flush>
                    {memberships.length === 0 ? (
                      <EmptyState />
                    ) : (
                      <Table head={[t('member.plan'), t('renew.startDate'), t('member.validUntil'), t('renew.total'), t('common.status'), '']}>
                        {memberships.map((ms) => (
                          <tr key={ms.id}>
                            <Td className="font-medium">{ms.plan.name}</Td>
                            <Td className="font-mono text-xs whitespace-nowrap">{date(ms.startDate)}</Td>
                            <Td className="font-mono text-xs whitespace-nowrap">{date(ms.endDate)}</Td>
                            <Td className="font-mono text-xs whitespace-nowrap">{money(ms.price)}</Td>
                            <Td>
                              <MembershipTag status={ms.status} />
                            </Td>
                            <Td className="text-right">
                              {user?.role === 'ADMIN' && (ms.status === 'ACTIVE' || ms.status === 'UPCOMING') && (
                                <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => api.memberships.cancel(ms.id))}>
                                  {t('member.cancelMembership')}
                                </Button>
                              )}
                            </Td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </Panel>

                  <div className="grid gap-6 md:grid-cols-2">
                    <Panel title={t('member.checkins')} flush>
                      {checkins.data.length === 0 ? (
                        <EmptyState />
                      ) : (
                        <ul className="divide-y">
                          {checkins.data.map((c) => (
                            <li key={c.id} className="flex justify-between px-4 py-2 text-sm">
                              <span>{date(c.checkedInAt, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                              <span className="font-mono text-xs text-muted">{time(c.checkedInAt)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Panel>
                    <Panel title={t('member.bookings')} flush>
                      {bookings.data.length === 0 ? (
                        <EmptyState />
                      ) : (
                        <ul className="divide-y">
                          {bookings.data.map((b) => (
                            <li key={b.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{b.session.name}</p>
                                <p className="font-mono text-xs text-muted">
                                  {date(b.session.startAt, { day: 'numeric', month: 'short' })} {time(b.session.startAt)}
                                </p>
                              </div>
                              <BookingTag status={b.status} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </Panel>
                  </div>
                </div>
              </div>

              <MemberFormModal open={editing} member={member} onClose={() => setEditing(false)} onSaved={() => query.reload()} />
              <MembershipModal member={renewing ? member : null} onClose={() => setRenewing(false)} onSaved={query.reload} />
            </div>
          )
        }}
      </QueryView>
    </>
  )
}
