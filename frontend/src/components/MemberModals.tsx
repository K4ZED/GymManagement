import { useEffect, useState, type FormEvent } from 'react'
import { api, type MemberInput } from '@/api'
import { useI18n } from '@/i18n'
import { useToast } from '@/lib/toast'
import { useQuery } from '@/lib/useQuery'
import type { Gender, Member } from '@/types'
import { Button, Field, FormError, Input, Modal, Select, Textarea } from './ui'

interface FormState {
  name: string
  email: string
  password: string
  phone: string
  gender: Gender | ''
  birthDate: string
  address: string
  emergencyContact: string
  planId: string
}

const empty: FormState = { name: '', email: '', password: '', phone: '', gender: '', birthDate: '', address: '', emergencyContact: '', planId: '' }

/** Form tambah/ubah member. Saat tambah bisa langsung memilih paket awal. */
export function MemberFormModal({ open, member, onClose, onSaved }: { open: boolean; member?: Member | null; onClose: () => void; onSaved: (m: Member) => void }) {
  const { t, tError, money } = useI18n()
  const toast = useToast()
  const plans = useQuery(() => (open && !member ? api.plans.list() : Promise.resolve([])), [open, member])
  const [form, setForm] = useState<FormState>(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setForm(
      member
        ? {
            ...empty,
            name: member.name,
            email: member.email,
            phone: member.phone ?? '',
            gender: member.gender ?? '',
            birthDate: member.birthDate?.slice(0, 10) ?? '',
            address: member.address ?? '',
            emergencyContact: member.emergencyContact ?? '',
          }
        : empty,
    )
  }, [open, member])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const body: MemberInput = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      gender: form.gender || null,
      birthDate: form.birthDate || null,
      address: form.address.trim() || null,
      emergencyContact: form.emergencyContact.trim() || null,
    }
    if (form.password) body.password = form.password
    if (!member && form.planId) body.planId = form.planId
    try {
      const saved = member ? await api.members.update(member.id, body) : await api.members.create(body)
      toast(t('common.saved'))
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(tError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? t('member.edit') : t('member.add')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="member-form" loading={saving}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="member-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t('member.name')} className="sm:col-span-2">
          {(id) => <Input id={id} required value={form.name} onChange={(e) => set('name', e.target.value)} />}
        </Field>
        <Field label={t('member.email')}>{(id) => <Input id={id} type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />}</Field>
        <Field label={member ? `${t('user.newPassword')}` : t('member.password')}>
          {(id) => <Input id={id} type="password" minLength={8} required={!member} autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />}
        </Field>
        <Field label={t('member.phone')}>{(id) => <Input id={id} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />}</Field>
        <Field label={t('member.gender')}>
          {(id) => (
            <Select id={id} value={form.gender} onChange={(e) => set('gender', e.target.value as Gender | '')}>
              <option value="">—</option>
              <option value="MALE">{t('member.gender.MALE')}</option>
              <option value="FEMALE">{t('member.gender.FEMALE')}</option>
            </Select>
          )}
        </Field>
        <Field label={t('member.birthDate')}>{(id) => <Input id={id} type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} />}</Field>
        <Field label={t('member.emergencyContact')}>{(id) => <Input id={id} value={form.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} />}</Field>
        <Field label={t('member.address')} className="sm:col-span-2">
          {(id) => <Textarea id={id} value={form.address} onChange={(e) => set('address', e.target.value)} />}
        </Field>
        {!member && (
          <Field label={t('member.initialPlan')} className="sm:col-span-2">
            {(id) => (
              <Select id={id} value={form.planId} onChange={(e) => set('planId', e.target.value)}>
                <option value="">{t('member.noInitialPlan')}</option>
                {(plans.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {t('plan.days', { n: p.durationDays })} — {money(p.price)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
      </form>
    </Modal>
  )
}

/** Daftar / perpanjang membership (POST /members/:id/memberships) */
export function MembershipModal({ member, onClose, onSaved }: { member: Pick<Member, 'id' | 'name' | 'activeMembership'> | null; onClose: () => void; onSaved: () => void }) {
  const { t, tError, money, date } = useI18n()
  const toast = useToast()
  const plans = useQuery(() => (member ? api.plans.list() : Promise.resolve([])), [member])
  const [planId, setPlanId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!member) return
    setError('')
    setStartDate('')
    setNotes('')
    setPlanId(member.activeMembership?.planId ?? '')
  }, [member])

  const list = plans.data ?? []
  const plan = list.find((p) => p.id === planId)

  async function submit() {
    if (!member || !plan) return
    setSaving(true)
    setError('')
    try {
      await api.members.addMembership(member.id, {
        planId: plan.id,
        startDate: startDate ? new Date(startDate + 'T00:00:00').toISOString() : undefined,
        notes: notes.trim() || undefined,
      })
      toast(t('renew.success'))
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
      open={!!member}
      onClose={onClose}
      title={t('renew.title')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} loading={saving} disabled={!plan}>
            {t('renew.submit')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm">
          <span className="font-semibold">{member?.name}</span>
          {member?.activeMembership && (
            <span className="text-muted">
              {' '}
              · {member.activeMembership.plan.name}, {t('member.validUntil').toLowerCase()} {date(member.activeMembership.endDate)}
            </span>
          )}
        </p>
        <fieldset>
          <legend className="eyebrow mb-2">{t('renew.choosePlan')}</legend>
          <div className="divide-y border">
            {list.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 has-checked:bg-surface-2">
                <input type="radio" name="plan" className="accent-[var(--ink)]" checked={planId === p.id} onChange={() => setPlanId(p.id)} />
                <span className="flex-1 text-sm font-medium">{p.name}</span>
                <span className="font-mono text-xs text-muted">{t('plan.days', { n: p.durationDays })}</span>
                <span className="w-28 text-right font-mono text-sm">{money(p.price)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={`${t('renew.startDate')} (${t('common.optional')})`} hint={t('renew.startHint')}>
          {(id) => <Input id={id} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />}
        </Field>
        <Field label={`${t('common.notes')} (${t('common.optional')})`}>{(id) => <Input id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
        <FormError message={error} />
      </div>
    </Modal>
  )
}
