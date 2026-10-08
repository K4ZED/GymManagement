import { useEffect, useState, type FormEvent } from 'react'
import { api, ApiError, type ClassInput } from '@/api'
import { useI18n } from '@/i18n'
import { useToast } from '@/lib/toast'
import { useQuery } from '@/lib/useQuery'
import { isoToLocalTime, localToIso, toDateStr, todayStr } from '@/lib/format'
import type { ClassSession } from '@/types'
import { Button, EmptyState, Field, FormError, Input, Modal, QueryView, Select, Spinner, Textarea } from './ui'
import { BookingTag, ClassTag } from './status'

interface FormState {
  name: string
  description: string
  trainerId: string
  date: string
  start: string
  end: string
  capacity: number
  room: string
}

export function ClassFormModal({ session, defaultDate, onClose, onSaved }: { session: ClassSession | 'new' | null; defaultDate?: string; onClose: () => void; onSaved: () => void }) {
  const { t, tError } = useI18n()
  const toast = useToast()
  const trainers = useQuery(() => (session ? api.trainers.list() : Promise.resolve([])), [!!session])
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    setError('')
    if (session === 'new') {
      setForm({ name: '', description: '', trainerId: '', date: defaultDate ?? todayStr(), start: '07:00', end: '08:00', capacity: 15, room: '' })
    } else {
      setForm({
        name: session.name,
        description: session.description ?? '',
        trainerId: session.trainer.id,
        date: toDateStr(new Date(session.startAt)),
        start: isoToLocalTime(session.startAt),
        end: isoToLocalTime(session.endAt),
        capacity: session.capacity,
        room: session.room ?? '',
      })
    }
  }, [session, defaultDate])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => (f ? { ...f, [k]: v } : f))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form || !session) return
    setSaving(true)
    setError('')
    const body: ClassInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      trainerId: form.trainerId,
      startAt: localToIso(form.date, form.start),
      endAt: localToIso(form.date, form.end),
      capacity: form.capacity,
      room: form.room.trim() || null,
    }
    try {
      if (session === 'new') await api.classes.create(body)
      else await api.classes.update(session.id, body)
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
      open={!!session}
      onClose={onClose}
      title={session === 'new' ? t('class.add') : t('class.edit')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="class-form" loading={saving}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      {!form ? (
        <Spinner />
      ) : (
        <form id="class-form" onSubmit={submit} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label={t('class.name')} className="col-span-2 sm:col-span-3">
            {(id) => <Input id={id} required value={form.name} onChange={(e) => set('name', e.target.value)} />}
          </Field>
          <Field label={t('class.trainer')} className="col-span-2 sm:col-span-3">
            {(id) => (
              <Select id={id} required value={form.trainerId} onChange={(e) => set('trainerId', e.target.value)}>
                <option value="" disabled>
                  —
                </option>
                {(trainers.data ?? []).map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.name}
                    {tr.specialization && ` — ${tr.specialization}`}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('class.date')} className="col-span-2 sm:col-span-1">
            {(id) => <Input id={id} type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} />}
          </Field>
          <Field label={t('class.start')}>{(id) => <Input id={id} type="time" required value={form.start} onChange={(e) => set('start', e.target.value)} />}</Field>
          <Field label={t('class.end')}>{(id) => <Input id={id} type="time" required value={form.end} onChange={(e) => set('end', e.target.value)} />}</Field>
          <Field label={t('class.capacity')}>
            {(id) => <Input id={id} type="number" min={1} required value={form.capacity} onChange={(e) => set('capacity', Number(e.target.value))} />}
          </Field>
          <Field label={t('class.room')} className="sm:col-span-2">
            {(id) => <Input id={id} value={form.room} onChange={(e) => set('room', e.target.value)} />}
          </Field>
          <Field label={`${t('class.description')} (${t('common.optional')})`} className="col-span-2 sm:col-span-3">
            {(id) => <Textarea id={id} value={form.description} onChange={(e) => set('description', e.target.value)} />}
          </Field>
          <div className="col-span-2 sm:col-span-3">
            <FormError message={error} />
          </div>
        </form>
      )}
    </Modal>
  )
}

/** Detail kelas + daftar peserta. `manage` = ADMIN/STAFF (bisa tambah peserta, ubah, batalkan kelas). */
export function ClassDetailModal({
  sessionId,
  manage,
  onClose,
  onEdit,
  onChanged,
}: {
  sessionId: string | null
  manage?: boolean
  onClose: () => void
  onEdit?: (s: ClassSession) => void
  onChanged?: () => void
}) {
  const { t, tError, date, time } = useI18n()
  const toast = useToast()
  const query = useQuery(() => (sessionId ? api.classes.get(sessionId) : Promise.resolve(null)), [sessionId])
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => setCode(''), [sessionId])

  async function act(fn: () => Promise<unknown>, confirmFirst = false) {
    if (confirmFirst && !confirm(t('common.confirm'))) return
    setBusy(true)
    try {
      await fn()
      toast(t('common.saved'))
      query.reload()
      onChanged?.()
    } catch (err) {
      toast(tError(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function addParticipant(e: FormEvent) {
    e.preventDefault()
    const memberCode = code.trim().toUpperCase()
    if (!memberCode || !sessionId) return
    await act(async () => {
      const found = await api.members.list({ q: memberCode, limit: 5 })
      const member = found.data.find((m) => m.memberCode.toUpperCase() === memberCode)
      if (!member) throw new ApiError('NOT_FOUND', 'Member not found', 404)
      await api.classes.book(sessionId, member.id)
      setCode('')
    })
  }

  const s = query.data
  return (
    <Modal open={!!sessionId} onClose={onClose} title={s?.name ?? t('common.loading')}>
      <QueryView query={query}>
        {(s) =>
          s && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="display text-3xl">
                  {time(s.startAt)}–{time(s.endAt)}
                </p>
                <ClassTag status={s.status} />
              </div>
              <p className="-mt-3 text-sm text-muted">
                {date(s.startAt, { weekday: 'long', day: 'numeric', month: 'long' })} · {s.trainer.name}
                {s.room && ` · ${s.room}`}
              </p>
              {s.description && <p className="text-sm">{s.description}</p>}

              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="eyebrow">{t('class.participants')}</h3>
                  <span className="font-mono text-xs text-muted">{t('class.slots', { booked: s.bookedCount, capacity: s.capacity })}</span>
                </div>
                {!s.bookings || s.bookings.length === 0 ? (
                  <div className="border">
                    <EmptyState />
                  </div>
                ) : (
                  <ul className="divide-y border">
                    {s.bookings.map((b) => (
                      <li key={b.id} className="flex items-center gap-3 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{b.member.name}</p>
                          <p className="font-mono text-xs text-muted">{b.member.memberCode}</p>
                        </div>
                        {b.status === 'BOOKED' && s.status !== 'CANCELLED' ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" disabled={busy} onClick={() => act(() => api.bookings.attend(b.id))}>
                              {t('class.markAttended')}
                            </Button>
                            {manage && (
                              <Button size="sm" variant="ghost" disabled={busy} onClick={() => act(() => api.bookings.cancel(b.id), true)}>
                                {t('common.cancel')}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <BookingTag status={b.status} />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {manage && s.status === 'SCHEDULED' && (
                <>
                  <form onSubmit={addParticipant} className="flex gap-2">
                    <Input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder={t('class.addParticipant')}
                      aria-label={t('class.addParticipant')}
                      className="font-mono uppercase placeholder:font-sans placeholder:normal-case"
                    />
                    <Button type="submit" variant="secondary" disabled={busy || s.availableSlots <= 0}>
                      +
                    </Button>
                  </form>
                  <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                    <Button variant="danger" size="sm" disabled={busy} onClick={() => act(() => api.classes.cancel(s.id), true)}>
                      {t('class.cancelClass')}
                    </Button>
                    {onEdit && (
                      <Button variant="secondary" size="sm" onClick={() => onEdit(s)}>
                        {t('common.edit')}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        }
      </QueryView>
    </Modal>
  )
}
