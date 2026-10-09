import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Copy, GripVertical, MoveRight } from 'lucide-react'
import clsx from 'clsx'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { api, ApiError } from '@/api'
import { useI18n } from '@/i18n'
import { useQuery } from '@/lib/useQuery'
import { useToast } from '@/lib/toast'
import { addDays, isoToLocalTime, localToIso, startOfWeek, toDateStr, todayStr } from '@/lib/format'
import type { ClassSession } from '@/types'
import { Button, IconButton, PageHeader, QueryView } from '@/components/ui'
import { ClassDetailModal, ClassFormModal } from '@/components/ClassModals'

/** Kelas yang sudah selesai/berlangsung hanya bisa disalin, tidak dipindah */
const canMove = (s: ClassSession) => s.status === 'SCHEDULED'
const canDrag = (s: ClassSession) => s.status !== 'CANCELLED'

/** Jadwal baru dengan jam & durasi yang sama di tanggal lain */
function shiftTo(s: ClassSession, day: string) {
  const startAt = localToIso(day, isoToLocalTime(s.startAt))
  const duration = new Date(s.endAt).getTime() - new Date(s.startAt).getTime()
  return { startAt, endAt: new Date(new Date(startAt).getTime() + duration).toISOString() }
}

export default function ClassesPage() {
  const { t, tError, date } = useI18n()
  const toast = useToast()
  const today = todayStr()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today))
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const query = useQuery(
    () =>
      api.classes.list({
        from: new Date(weekStart + 'T00:00:00').toISOString(),
        to: new Date(addDays(weekStart, 7) + 'T00:00:00').toISOString(),
        includeCancelled: true,
      }),
    [weekStart],
  )
  const [editing, setEditing] = useState<ClassSession | 'new' | null>(null)
  const [newDate, setNewDate] = useState<string | undefined>()
  const [openId, setOpenId] = useState<string | null>(null)

  // --- Drag & drop ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), // klik biasa tetap membuka detail
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  )
  const [dragging, setDragging] = useState<ClassSession | null>(null)
  const [altHeld, setAltHeld] = useState(false)
  const copyMode = !!dragging && (altHeld || !canMove(dragging))

  // Alt/Option bisa ditekan atau dilepas di tengah drag
  useEffect(() => {
    if (!dragging) return
    const onKey = (e: KeyboardEvent) => setAltHeld(e.altKey)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [dragging])

  function onDragStart(e: DragStartEvent) {
    const s = query.data?.find((x) => x.id === e.active.id)
    setDragging(s ?? null)
    setAltHeld((e.activatorEvent as MouseEvent | undefined)?.altKey ?? false)
  }

  async function onDragEnd(e: DragEndEvent) {
    const s = dragging
    const copy = copyMode
    setDragging(null)
    const day = e.over?.id as string | undefined
    if (!s || !day) return
    if (!copy && toDateStr(new Date(s.startAt)) === day) return

    const next = shiftTo(s, day)
    const dayLabel = date(day, { weekday: 'long', day: 'numeric', month: 'short' })
    if (new Date(next.startAt).getTime() < Date.now()) {
      toast(t('class.inPast'), 'error')
      return
    }

    if (copy) {
      try {
        const created = await api.classes.create({
          name: s.name,
          description: s.description,
          trainerId: s.trainer.id,
          capacity: s.capacity,
          room: s.room,
          ...next,
        })
        query.reload()
        toast(t('class.copied', { day: dayLabel }), 'success', {
          label: t('class.undo'),
          onClick: () =>
            undo(async () => {
              // Salinan baru biasanya belum punya booking, jadi dihapus. Jika sudah ada yang booking, dibatalkan saja.
              try {
                await api.classes.remove(created.id)
              } catch (err) {
                if (err instanceof ApiError && err.code === 'CLASS_HAS_BOOKINGS') await api.classes.cancel(created.id)
                else throw err
              }
            }),
        })
      } catch (err) {
        toast(tError(err), 'error')
      }
      return
    }

    if (s.bookedCount > 0 && !confirm(t('class.moveConfirm', { n: s.bookedCount }))) return
    const prev = { startAt: s.startAt, endAt: s.endAt }
    // Optimistis: kartu langsung pindah, dikembalikan jika gagal
    query.setData((list) => list?.map((x) => (x.id === s.id ? { ...x, ...next } : x)))
    try {
      await api.classes.update(s.id, next)
      toast(t('class.moved', { day: dayLabel }), 'success', {
        label: t('class.undo'),
        onClick: () => undo(() => api.classes.update(s.id, prev)),
      })
    } catch (err) {
      toast(tError(err), 'error')
    } finally {
      query.reload()
    }
  }

  async function undo(fn: () => Promise<unknown>) {
    try {
      await fn()
    } catch (err) {
      toast(tError(err), 'error')
    } finally {
      query.reload()
    }
  }

  return (
    <>
      <PageHeader
        title={t('class.title')}
        meta={`${date(weekStart, { day: 'numeric', month: 'short' })} - ${date(addDays(weekStart, 6), { day: 'numeric', month: 'short', year: 'numeric' })}`}
        actions={
          <>
            <div className="flex items-center rounded-md border bg-surface">
              <IconButton label={t('common.prev')} onClick={() => setWeekStart(addDays(weekStart, -7))}>
                <ChevronLeft size={18} />
              </IconButton>
              <button type="button" className="px-2 text-xs font-semibold" onClick={() => setWeekStart(startOfWeek(today))}>
                {t('class.thisWeek')}
              </button>
              <IconButton label={t('common.next')} onClick={() => setWeekStart(addDays(weekStart, 7))}>
                <ChevronRight size={18} />
              </IconButton>
            </div>
            <Button
              onClick={() => {
                setNewDate(days.includes(today) ? today : weekStart)
                setEditing('new')
              }}
            >
              + {t('class.add')}
            </Button>
          </>
        }
      />
      <p className="-mt-3 mb-4 text-xs text-muted">{t('class.dragHint')}</p>

      <QueryView query={query}>
        {(sessions) => (
          <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
            {/* Papan jadwal: 7 kolom di layar lebar, bertumpuk per hari di layar kecil */}
            <div className="grid border-t border-l bg-surface lg:grid-cols-7">
              {days.map((d) => (
                <DayColumn
                  key={d}
                  day={d}
                  isToday={d === today}
                  isPast={d < today}
                  sessions={sessions.filter((s) => toDateStr(new Date(s.startAt)) === d)}
                  onOpen={setOpenId}
                  onAdd={() => {
                    setNewDate(d)
                    setEditing('new')
                  }}
                />
              ))}
            </div>
            <DragOverlay dropAnimation={null}>
              {dragging && (
                <div className="relative rotate-1 shadow-lg">
                  <ClassCardBody s={dragging} />
                  <span className="absolute -top-2.5 right-1 flex items-center gap-1 bg-ink px-1.5 py-0.5 text-xs font-semibold text-ink-fg uppercase">
                    {copyMode ? <Copy size={11} /> : <MoveRight size={11} />}
                    {copyMode ? t('class.dragCopy') : t('class.dragMove')}
                  </span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </QueryView>

      <ClassDetailModal
        sessionId={openId}
        manage
        onClose={() => setOpenId(null)}
        onChanged={query.reload}
        onEdit={(s) => {
          setOpenId(null)
          setEditing(s)
        }}
      />
      <ClassFormModal session={editing} defaultDate={newDate} onClose={() => setEditing(null)} onSaved={query.reload} />
    </>
  )
}

function DayColumn({
  day,
  isToday,
  isPast,
  sessions,
  onOpen,
  onAdd,
}: {
  day: string
  isToday: boolean
  isPast: boolean
  sessions: ClassSession[]
  onOpen: (id: string) => void
  onAdd: () => void
}) {
  const { t, date } = useI18n()
  const { setNodeRef, isOver, active } = useDroppable({ id: day, disabled: isPast })
  return (
    <section
      ref={setNodeRef}
      className={clsx(
        'flex min-h-28 flex-col border-r border-b transition-colors lg:min-h-[420px]',
        isOver && 'bg-primary-soft outline-2 -outline-offset-2 outline-primary outline-dashed',
        active && isPast && 'opacity-50',
      )}
    >
      <header className={clsx('flex items-baseline justify-between border-b px-3 py-2', isToday && 'bg-ink text-ink-fg')}>
        <span className="display text-lg">{date(day, { weekday: 'short' })}</span>
        <span className="text-xs opacity-70">{date(day, { day: 'numeric', month: 'short' })}</span>
      </header>
      <div className="flex-1 space-y-1.5 p-1.5">
        {sessions.map((s) => (
          <DraggableCard key={s.id} s={s} onOpen={() => onOpen(s.id)} />
        ))}
        {!isPast && (
          <button
            type="button"
            onClick={onAdd}
            className="w-full py-1 text-xs text-muted opacity-60 transition hover:text-text hover:opacity-100"
            aria-label={`${t('class.add')} ${date(day)}`}
          >
            +
          </button>
        )}
      </div>
    </section>
  )
}

function DraggableCard({ s, onOpen }: { s: ClassSession; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: s.id, disabled: !canDrag(s) })
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onOpen}
      {...listeners}
      {...attributes}
      className={clsx('group block w-full text-left', canDrag(s) && 'cursor-grab active:cursor-grabbing', isDragging && 'opacity-30')}
    >
      <ClassCardBody s={s} draggable={canDrag(s)} />
    </button>
  )
}

function ClassCardBody({ s, draggable }: { s: ClassSession; draggable?: boolean }) {
  const { t, time } = useI18n()
  const full = s.availableSlots === 0 && s.status !== 'CANCELLED'
  return (
    <div
      className={clsx(
        'relative rounded-md border bg-bg px-2 py-1.5 transition group-hover:bg-surface-2',
        (s.status === 'FINISHED' || s.status === 'CANCELLED') && 'opacity-55',
      )}
    >
      {draggable && <GripVertical size={14} className="absolute top-1.5 right-1 text-muted opacity-0 transition group-hover:opacity-100" />}
      <p className="text-xs text-muted tabular-nums">{time(s.startAt)}</p>
      <p className={clsx('text-sm leading-tight font-semibold', s.status === 'CANCELLED' && 'line-through')}>{s.name}</p>
      <p className="truncate text-xs text-muted">{s.trainer.name}</p>
      <p className={clsx('text-xs tabular-nums', full ? 'font-semibold text-warning' : 'text-muted')}>
        {s.status === 'CANCELLED' ? t('class.status.CANCELLED') : full ? t('class.full') : t('class.slots', { booked: s.bookedCount, capacity: s.capacity })}
      </p>
    </div>
  )
}
