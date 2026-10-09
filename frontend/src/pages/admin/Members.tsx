import { useDeferredValue, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { api } from '@/api'
import { useI18n } from '@/i18n'
import { useQuery } from '@/lib/useQuery'
import type { Member } from '@/types'
import { Button, EmptyState, Input, PageHeader, Pagination, Panel, QueryView, Segmented, Table, Td } from '@/components/ui'
import { MemberTag } from '@/components/status'
import { MemberFormModal, MembershipModal } from '@/components/MemberModals'

type Filter = 'ALL' | 'ACTIVE' | 'INACTIVE'

export default function MembersPage() {
  const { t, date } = useI18n()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<Filter>('ALL')
  const [page, setPage] = useState(1)
  const deferredQ = useDeferredValue(q)
  const query = useQuery(() => api.members.list({ q: deferredQ.trim(), status: status === 'ALL' ? undefined : status, page, limit: 20 }), [deferredQ, status, page])
  const [formOpen, setFormOpen] = useState(false)
  const [renewing, setRenewing] = useState<Member | null>(null)

  return (
    <>
      <PageHeader
        title={t('member.title')}
        meta={query.data && t('member.count', { n: query.data.meta.total })}
        actions={<Button onClick={() => setFormOpen(true)}>+ {t('member.add')}</Button>}
      />

      <Panel flush>
        <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <Input
              className="pl-9"
              placeholder={t('common.search')}
              aria-label={t('common.search')}
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="overflow-x-auto">
            <Segmented<Filter>
              value={status}
              onChange={(v) => {
                setStatus(v)
                setPage(1)
              }}
              options={[
                { value: 'ALL', label: t('common.all') },
                { value: 'ACTIVE', label: t('member.filter.ACTIVE') },
                { value: 'INACTIVE', label: t('member.filter.INACTIVE') },
              ]}
            />
          </div>
        </div>

        <QueryView query={query}>
          {({ data: members, meta }) => {
            if (members.length === 0) return <EmptyState />
            return (
              <>
                <div className="hidden md:block">
                  <Table head={[t('member.code'), t('member.name'), t('member.plan'), t('member.validUntil'), t('common.status'), '']}>
                    {members.map((m) => (
                      <tr key={m.id} className="cursor-pointer hover:bg-surface-2/70" onClick={() => navigate(`/admin/members/${m.id}`)}>
                        <Td className="font-mono text-xs text-muted">{m.memberCode}</Td>
                        <Td>
                          <Link to={`/admin/members/${m.id}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                            {m.name}
                          </Link>
                          <p className="text-xs text-muted">{m.phone ?? m.email}</p>
                        </Td>
                        <Td>{m.activeMembership?.plan.name ?? <span className="text-muted">-</span>}</Td>
                        <Td className="font-mono text-xs whitespace-nowrap">{m.activeMembership ? date(m.activeMembership.endDate) : '-'}</Td>
                        <Td>
                          <MemberTag member={m} />
                        </Td>
                        <Td className="text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!m.isActive}
                            onClick={(e) => {
                              e.stopPropagation()
                              setRenewing(m)
                            }}
                          >
                            {m.activeMembership ? t('member.renew') : t('member.register')}
                          </Button>
                        </Td>
                      </tr>
                    ))}
                  </Table>
                </div>

                <ul className="divide-y md:hidden">
                  {members.map((m) => (
                    <li key={m.id}>
                      <Link to={`/admin/members/${m.id}`} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{m.name}</p>
                          <p className="font-mono text-xs text-muted">{m.memberCode}</p>
                        </div>
                        <MemberTag member={m} />
                      </Link>
                    </li>
                  ))}
                </ul>
                <Pagination meta={meta} onPage={setPage} />
              </>
            )
          }}
        </QueryView>
      </Panel>

      <MemberFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={(m) => navigate(`/admin/members/${m.id}`)} />
      <MembershipModal member={renewing} onClose={() => setRenewing(null)} onSaved={query.reload} />
    </>
  )
}
