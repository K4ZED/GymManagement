import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/api'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@/lib/useQuery'
import { useToast } from '@/lib/toast'
import type { User } from '@/types'
import { Button, Checkbox, EmptyState, Field, FormError, Input, Modal, PageHeader, Pagination, Panel, QueryView, Select, Table, Tag, Td } from '@/components/ui'

/** Akun ADMIN & STAFF (khusus ADMIN). Akun trainer/member dikelola di halamannya masing-masing. */
export default function UsersPage() {
  const { t, date } = useI18n()
  const { user: me } = useAuth()
  const [page, setPage] = useState(1)
  // Ambil ADMIN dan STAFF; endpoint hanya menerima satu role, jadi digabung di sisi klien
  const query = useQuery(async () => {
    const [admins, staff] = await Promise.all([api.users.list({ role: 'ADMIN', limit: 100 }), api.users.list({ role: 'STAFF', page, limit: 20 })])
    return { rows: page === 1 ? [...admins.data, ...staff.data] : staff.data, meta: staff.meta }
  }, [page])
  const [editing, setEditing] = useState<User | 'new' | null>(null)

  return (
    <>
      <PageHeader title={t('user.title')} actions={<Button onClick={() => setEditing('new')}>+ {t('user.add')}</Button>} />
      <Panel flush>
        <QueryView query={query}>
          {({ rows, meta }) =>
            rows.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <Table head={[t('user.name'), t('user.email'), t('user.role'), t('member.joinedAt'), t('common.status'), '']}>
                  {rows.map((u) => (
                    <tr key={u.id} className={u.isActive ? '' : 'text-muted'}>
                      <Td className="font-semibold">
                        {u.name}
                        {u.id === me?.id && <span className="eyebrow ml-2">({t('user.you')})</span>}
                      </Td>
                      <Td className="text-sm">{u.email}</Td>
                      <Td className="eyebrow">{t(`role.${u.role}`)}</Td>
                      <Td className="text-xs">{date(u.createdAt)}</Td>
                      <Td>{u.isActive ? <Tag tone="success">{t('common.active')}</Tag> : <Tag>{t('common.inactive')}</Tag>}</Td>
                      <Td className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                          {t('common.edit')}
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </Table>
                <Pagination meta={meta} onPage={setPage} />
              </>
            )
          }
        </QueryView>
      </Panel>
      <UserModal user={editing} onClose={() => setEditing(null)} onSaved={query.reload} />
    </>
  )
}

function UserModal({ user, onClose, onSaved }: { user: User | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const { t, tError } = useI18n()
  const toast = useToast()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'STAFF' as 'ADMIN' | 'STAFF', isActive: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isNew = user === 'new'
  const { user: me } = useAuth()
  // Admin tidak boleh menonaktifkan akunnya sendiri
  const isSelf = !isNew && !!user && user.id === me?.id

  useEffect(() => {
    if (!user) return
    setError('')
    setForm(
      user === 'new'
        ? { name: '', email: '', phone: '', password: '', role: 'STAFF', isActive: true }
        : { name: user.name, email: user.email, phone: user.phone ?? '', password: '', role: user.role === 'ADMIN' ? 'ADMIN' : 'STAFF', isActive: user.isActive },
    )
  }, [user])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (user === 'new') {
        await api.users.create({ name: form.name.trim(), email: form.email.trim(), password: form.password, phone: form.phone.trim() || undefined, role: form.role })
      } else if (user) {
        await api.users.update(user.id, {
          name: form.name.trim(),
          phone: form.phone.trim(),
          ...(isSelf ? {} : { isActive: form.isActive }),
          ...(form.password ? { password: form.password } : {}),
        })
      }
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
      open={!!user}
      onClose={onClose}
      title={isNew ? t('user.add') : t('user.edit')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="user-form" loading={saving}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t('user.name')} className="sm:col-span-2">
          {(id) => <Input id={id} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
        </Field>
        <Field label={t('user.email')}>
          {(id) => <Input id={id} type="email" required disabled={!isNew} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />}
        </Field>
        <Field label={t('user.phone')}>{(id) => <Input id={id} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />}</Field>
        {isNew && (
          <Field label={t('user.role')}>
            {(id) => (
              <Select id={id} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'STAFF' })}>
                <option value="STAFF">{t('role.STAFF')}</option>
                <option value="ADMIN">{t('role.ADMIN')}</option>
              </Select>
            )}
          </Field>
        )}
        <Field label={isNew ? t('user.password') : t('user.newPassword')} className={isNew ? '' : 'sm:col-span-2'}>
          {(id) => (
            <Input id={id} type="password" minLength={8} required={isNew} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          )}
        </Field>
        {!isNew && (
          <div className="sm:col-span-2">
            {isSelf ? (
              <p className="text-xs text-muted">{t('user.selfNote')}</p>
            ) : (
              <Checkbox label={t('common.active')} checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            )}
          </div>
        )}
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
      </form>
    </Modal>
  )
}
