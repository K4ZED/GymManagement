import { useEffect, useState, type FormEvent } from 'react'
import { api, type PlanInput } from '@/api'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@/lib/useQuery'
import { useToast } from '@/lib/toast'
import type { Plan } from '@/types'
import { Button, Checkbox, EmptyState, Field, FormError, Input, Modal, PageHeader, Panel, QueryView, Table, Tag, Td, Textarea } from '@/components/ui'

const emptyPlan: PlanInput = { name: '', description: '', durationDays: 30, price: 0, isActive: true }

export default function PlansPage() {
  const { t, money } = useI18n()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const query = useQuery(() => api.plans.list(true))
  const [editing, setEditing] = useState<Plan | 'new' | null>(null)

  return (
    <>
      <PageHeader title={t('plan.title')} actions={isAdmin && <Button onClick={() => setEditing('new')}>+ {t('plan.add')}</Button>} />
      <Panel flush>
        <QueryView query={query}>
          {(plans) =>
            plans.length === 0 ? (
              <EmptyState />
            ) : (
              <Table head={[t('plan.name'), t('plan.duration'), t('plan.price'), t('plan.description'), t('common.status'), '']}>
                {plans.map((p) => (
                  <tr key={p.id} className={p.isActive ? '' : 'text-muted'}>
                    <Td className="font-semibold">{p.name}</Td>
                    <Td className="font-mono text-xs">{t('plan.days', { n: p.durationDays })}</Td>
                    <Td className="font-mono text-sm whitespace-nowrap">{money(p.price)}</Td>
                    <Td className="max-w-xs text-sm text-muted">{p.description ?? '—'}</Td>
                    <Td>{p.isActive ? <Tag tone="success">{t('plan.isActive')}</Tag> : <Tag>{t('common.inactive')}</Tag>}</Td>
                    <Td className="text-right">
                      {isAdmin && (
                        <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                          {t('common.edit')}
                        </Button>
                      )}
                    </Td>
                  </tr>
                ))}
              </Table>
            )
          }
        </QueryView>
      </Panel>
      <PlanModal plan={editing} onClose={() => setEditing(null)} onSaved={query.reload} />
    </>
  )
}

function PlanModal({ plan, onClose, onSaved }: { plan: Plan | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const { t, tError } = useI18n()
  const toast = useToast()
  const [form, setForm] = useState<PlanInput>(emptyPlan)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!plan) return
    setError('')
    setForm(plan === 'new' ? emptyPlan : { name: plan.name, description: plan.description ?? '', durationDays: plan.durationDays, price: plan.price, isActive: plan.isActive })
  }, [plan])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const body = { ...form, description: form.description?.trim() || null }
    try {
      if (plan === 'new') await api.plans.create(body)
      else if (plan) await api.plans.update(plan.id, body)
      toast(t('common.saved'))
      onSaved()
      onClose()
    } catch (err) {
      setError(tError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={!!plan}
      onClose={onClose}
      title={plan === 'new' ? t('plan.add') : t('plan.edit')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="plan-form" loading={saving}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t('plan.name')} className="sm:col-span-2">
          {(id) => <Input id={id} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
        </Field>
        <Field label={t('plan.duration')}>
          {(id) => <Input id={id} type="number" min={1} required value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: Number(e.target.value) })} />}
        </Field>
        <Field label={t('plan.price')}>
          {(id) => <Input id={id} type="number" min={0} step={1000} required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />}
        </Field>
        <Field label={t('plan.description')} className="sm:col-span-2">
          {(id) => <Textarea id={id} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />}
        </Field>
        <div className="sm:col-span-2">
          <Checkbox label={t('plan.isActive')} checked={!!form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
        </div>
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
      </form>
    </Modal>
  )
}
