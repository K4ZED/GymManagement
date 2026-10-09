import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/api'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@/lib/useQuery'
import { useToast } from '@/lib/toast'
import type { Trainer } from '@/types'
import { Button, Checkbox, EmptyState, Field, FormError, Input, Modal, PageHeader, Panel, QueryView, Table, Tag, Td, Textarea } from '@/components/ui'

interface FormState {
  name: string
  email: string
  password: string
  phone: string
  specialization: string
  bio: string
  isActive: boolean
}
const empty: FormState = { name: '', email: '', password: '', phone: '', specialization: '', bio: '', isActive: true }

export default function TrainersPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const query = useQuery(() => api.trainers.list(true))
  const [editing, setEditing] = useState<Trainer | 'new' | null>(null)

  return (
    <>
      <PageHeader title={t('trainer.title')} actions={isAdmin && <Button onClick={() => setEditing('new')}>+ {t('trainer.add')}</Button>} />
      <Panel flush>
        <QueryView query={query}>
          {(trainers) =>
            trainers.length === 0 ? (
              <EmptyState />
            ) : (
              <Table head={[t('trainer.name'), t('trainer.specialization'), t('trainer.phone'), t('trainer.email'), t('common.status'), '']}>
                {trainers.map((tr) => (
                  <tr key={tr.id} className={tr.isActive ? '' : 'text-muted'}>
                    <Td className="font-semibold">{tr.name}</Td>
                    <Td>{tr.specialization ?? '-'}</Td>
                    <Td className="text-xs">{tr.phone ?? '-'}</Td>
                    <Td className="text-sm">{tr.email}</Td>
                    <Td>{tr.isActive ? <Tag tone="success">{t('common.active')}</Tag> : <Tag>{t('common.inactive')}</Tag>}</Td>
                    <Td className="text-right">
                      {isAdmin && (
                        <Button size="sm" variant="ghost" onClick={() => setEditing(tr)}>
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
      <TrainerModal trainer={editing} onClose={() => setEditing(null)} onSaved={query.reload} />
    </>
  )
}

function TrainerModal({ trainer, onClose, onSaved }: { trainer: Trainer | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const { t, tError } = useI18n()
  const toast = useToast()
  const [form, setForm] = useState<FormState>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isNew = trainer === 'new'

  useEffect(() => {
    if (!trainer) return
    setError('')
    setForm(
      trainer === 'new'
        ? empty
        : { ...empty, name: trainer.name, email: trainer.email, phone: trainer.phone ?? '', specialization: trainer.specialization ?? '', bio: trainer.bio ?? '', isActive: trainer.isActive },
    )
  }, [trainer])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const common = { name: form.name.trim(), phone: form.phone.trim() || null, specialization: form.specialization.trim() || null, bio: form.bio.trim() || null }
    try {
      if (trainer === 'new') await api.trainers.create({ ...common, email: form.email.trim(), password: form.password })
      else if (trainer) await api.trainers.update(trainer.id, { ...common, isActive: form.isActive })
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
      open={!!trainer}
      onClose={onClose}
      title={isNew ? t('trainer.add') : t('trainer.edit')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="trainer-form" loading={saving}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="trainer-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t('trainer.name')} className="sm:col-span-2">
          {(id) => <Input id={id} required value={form.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>
        <Field label={t('trainer.email')}>
          {(id) => <Input id={id} type="email" required disabled={!isNew} value={form.email} onChange={(e) => set('email', e.target.value)} />}
        </Field>
        {isNew ? (
          <Field label={t('trainer.password')}>
            {(id) => <Input id={id} type="password" minLength={8} required autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />}
          </Field>
        ) : (
          <Field label={t('trainer.phone')}>{(id) => <Input id={id} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />}</Field>
        )}
        {isNew && <Field label={t('trainer.phone')}>{(id) => <Input id={id} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />}</Field>}
        <Field label={t('trainer.specialization')} className={isNew ? '' : 'sm:col-span-2'}>
          {(id) => <Input id={id} value={form.specialization} onChange={(e) => set('specialization', e.target.value)} />}
        </Field>
        <Field label={t('trainer.bio')} className="sm:col-span-2">
          {(id) => <Textarea id={id} value={form.bio} onChange={(e) => set('bio', e.target.value)} />}
        </Field>
        {!isNew && (
          <div className="sm:col-span-2">
            <Checkbox label={t('common.active')} checked={form.isActive} onChange={(v) => set('isActive', v)} />
          </div>
        )}
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
      </form>
    </Modal>
  )
}
