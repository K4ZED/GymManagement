import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api'
import { useI18n } from '@/i18n'
import { useQuery } from '@/lib/useQuery'
import { daysUntil, todayStr } from '@/lib/format'
import type { CheckIn, Membership } from '@/types'
import { Button, EmptyState, Input, PageHeader, Pagination, Panel, QueryView } from '@/components/ui'

type Result = { ok: true; checkIn: CheckIn; membership: Membership } | { ok: false; message: string; code: string }

export default function CheckInPage() {
  const { t, tError, date, time } = useI18n()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [page, setPage] = useState(1)
  const inputRef = useRef<HTMLInputElement>(null)
  const list = useQuery(() => api.checkins.list({ date: todayStr(), page, limit: 15 }), [page])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const memberCode = code.trim().toUpperCase()
    if (!memberCode) return
    setSubmitting(true)
    try {
      const res = await api.checkins.create({ memberCode })
      setResult({ ok: true, checkIn: res, membership: res.activeMembership })
      setCode('')
      if (page === 1) list.reload()
      else setPage(1)
    } catch (err) {
      setResult({ ok: false, message: tError(err), code: memberCode })
    } finally {
      setSubmitting(false)
      inputRef.current?.focus()
    }
  }

  return (
    <>
      <PageHeader title={t('checkin.title')} meta={date(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })} />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <form onSubmit={submit} className="flex gap-2">
            <Input
              ref={inputRef}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('checkin.placeholder')}
              aria-label={t('checkin.placeholder')}
              className="h-14 font-mono text-lg uppercase placeholder:normal-case"
            />
            <Button type="submit" variant="accent" size="lg" className="h-14" loading={submitting}>
              {t('checkin.submit')}
            </Button>
          </form>
          <p className="text-xs text-muted">{t('checkin.hint')}</p>

          {result &&
            (result.ok ? (
              <div className="rounded-lg border bg-success-soft p-5">
                <p className="text-sm font-semibold text-success">
                  {t('checkin.success')}, {time(result.checkIn.checkedInAt)}
                </p>
                <p className="display mt-2 text-3xl">{result.checkIn.member.name}</p>
                <p className="mt-1 font-mono text-sm text-muted">{result.checkIn.member.memberCode}</p>
                <p className="mt-3 text-sm">
                  {result.membership.plan.name}, {t('member.validUntil').toLowerCase()} {date(result.membership.endDate)},{' '}
                  <span className={daysUntil(result.membership.endDate) <= 7 ? 'font-semibold text-warning' : ''}>
                    {t('member.daysLeft', { n: daysUntil(result.membership.endDate) })}
                  </span>
                </p>
              </div>
            ) : (
              <div className="rounded-lg border bg-danger-soft p-5">
                <p className="font-mono text-sm text-muted">{result.code}</p>
                <p className="mt-1 text-lg font-semibold text-danger">{result.message}</p>
              </div>
            ))}
        </div>

        <Panel title={t('checkin.today')} flush className="lg:col-span-2">
          <QueryView query={list}>
            {({ data, meta }) =>
              data.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <ul className="divide-y">
                    {data.map((c) => (
                      <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-12 text-xs text-muted tabular-nums">{time(c.checkedInAt)}</span>
                        <Link to={`/admin/members/${c.member.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
                          {c.member.name}
                        </Link>
                        <span className="font-mono text-xs text-muted">{c.member.memberCode}</span>
                      </li>
                    ))}
                  </ul>
                  <Pagination meta={meta} onPage={setPage} />
                </>
              )
            }
          </QueryView>
        </Panel>
      </div>
    </>
  )
}
