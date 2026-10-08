import { useState, type FormEvent } from 'react'
import { api } from '@/api'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/lib/toast'
import type { Gender, Me } from '@/types'
import { Button, Field, FormError, Input, Panel, Select, Textarea } from '@/components/ui'

/** Profil untuk member & trainer: lihat/ubah data diri + ganti kata sandi */
export default function ProfilePage() {
  const { t } = useI18n()
  const { user, logout } = useAuth()
  const [editing, setEditing] = useState(false)
  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">{t(`role.${user.role}`)}</p>
        <h1 className="display mt-1 text-4xl">{user.name}</h1>
      </div>

      <Panel
        title={t('profile.personal')}
        flush
        action={
          !editing && (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              {t('common.edit')}
            </Button>
          )
        }
      >
        {editing ? <DetailsForm user={user} onDone={() => setEditing(false)} /> : <DetailsView user={user} />}
      </Panel>

      <PasswordForm />

      <Button variant="danger" className="w-full" onClick={logout}>
        {t('auth.logout')}
      </Button>
    </div>
  )
}

function DetailsView({ user }: { user: Me }) {
  const { t, date } = useI18n()
  const { member, trainer } = user
  const rows: [string, string | null | undefined][] = [
    [t('member.email'), user.email],
    [t('member.phone'), user.phone],
    ...(member
      ? ([
          [t('member.code'), member.memberCode],
          [t('member.gender'), member.gender && t(`member.gender.${member.gender}`)],
          [t('member.birthDate'), member.birthDate && date(member.birthDate)],
          [t('member.address'), member.address],
          [t('member.emergencyContact'), member.emergencyContact],
          [t('member.joinedAt'), date(member.joinedAt)],
        ] as [string, string | null][])
      : []),
    ...(trainer
      ? ([
          [t('trainer.specialization'), trainer.specialization],
          [t('trainer.bio'), trainer.bio],
        ] as [string, string | null][])
      : []),
  ]
  return (
    <dl className="divide-y">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
          <dt className="shrink-0 text-muted">{label}</dt>
          <dd className="text-right whitespace-pre-line">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Email & kode member tidak bisa diubah sendiri (identitas login), sisanya bisa. */
function DetailsForm({ user, onDone }: { user: Me; onDone: () => void }) {
  const { t, tError } = useI18n()
  const { refresh } = useAuth()
  const toast = useToast()
  const { member, trainer } = user
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone ?? '',
    gender: (member?.gender ?? '') as Gender | '',
    birthDate: member?.birthDate?.slice(0, 10) ?? '',
    address: member?.address ?? '',
    emergencyContact: member?.emergencyContact ?? '',
    specialization: trainer?.specialization ?? '',
    bio: trainer?.bio ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const common = { name: form.name.trim(), phone: form.phone.trim() || null }
    try {
      if (member) {
        await api.members.update(member.id, {
          ...common,
          gender: form.gender || null,
          birthDate: form.birthDate || null,
          address: form.address.trim() || null,
          emergencyContact: form.emergencyContact.trim() || null,
        })
      } else if (trainer) {
        await api.trainers.update(trainer.id, { ...common, specialization: form.specialization.trim() || null, bio: form.bio.trim() || null })
      }
      await refresh()
      toast(t('profile.saved'))
      onDone()
    } catch (err) {
      setError(tError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 p-4 sm:grid-cols-2">
      <Field label={t('member.name')} className="sm:col-span-2">
        {(id) => <Input id={id} required value={form.name} onChange={(e) => set('name', e.target.value)} />}
      </Field>
      <Field label={t('member.email')}>{(id) => <Input id={id} value={user.email} disabled />}</Field>
      <Field label={t('member.phone')}>{(id) => <Input id={id} type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />}</Field>

      {member && (
        <>
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
          <Field label={t('member.emergencyContact')} className="sm:col-span-2">
            {(id) => <Input id={id} value={form.emergencyContact} onChange={(e) => set('emergencyContact', e.target.value)} />}
          </Field>
          <Field label={t('member.address')} className="sm:col-span-2">
            {(id) => <Textarea id={id} value={form.address} onChange={(e) => set('address', e.target.value)} />}
          </Field>
        </>
      )}

      {trainer && (
        <>
          <Field label={t('trainer.specialization')} className="sm:col-span-2">
            {(id) => <Input id={id} value={form.specialization} onChange={(e) => set('specialization', e.target.value)} />}
          </Field>
          <Field label={t('trainer.bio')} className="sm:col-span-2">
            {(id) => <Textarea id={id} value={form.bio} onChange={(e) => set('bio', e.target.value)} />}
          </Field>
        </>
      )}

      <div className="sm:col-span-2">
        <FormError message={error} />
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button variant="ghost" onClick={onDone}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" loading={saving}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const { t, tError } = useI18n()
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.auth.changePassword(current, next)
      toast(t('auth.passwordChanged'))
      setCurrent('')
      setNext('')
    } catch (err) {
      setError(tError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel title={t('auth.changePassword')}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('auth.currentPassword')}>
          {(id) => <Input id={id} type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}
        </Field>
        <Field label={t('auth.newPassword')}>
          {(id) => <Input id={id} type="password" required minLength={8} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}
        </Field>
        <FormError message={error} />
        <Button type="submit" loading={saving}>
          {t('common.save')}
        </Button>
      </form>
    </Panel>
  )
}
