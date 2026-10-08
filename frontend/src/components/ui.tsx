import { useEffect, useId, type ButtonHTMLAttributes, type ComponentPropsWithRef, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import clsx from 'clsx'
import { useI18n } from '@/i18n'
import { initials } from '@/lib/format'
import type { PageMeta } from '@/types'

/* ---------- Button ---------- */
// primary = tinta (hitam/putih); accent = oranye sinyal, hanya untuk satu aksi utama per layar
type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'
const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-ink-fg hover:opacity-85',
  accent: 'bg-primary text-primary-fg hover:brightness-110',
  secondary: 'border bg-surface text-text hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-2 hover:text-text',
  danger: 'border border-danger/40 text-danger hover:bg-danger-soft',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-base',
        buttonStyles[variant],
        className,
      )}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      {...rest}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex size-9 items-center justify-center rounded-md text-muted transition hover:bg-surface-2 hover:text-text focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ---------- Panel ---------- */
export function Panel({ className, children, title, action, flush }: { className?: string; children: ReactNode; title?: ReactNode; action?: ReactNode; flush?: boolean }) {
  return (
    <section className={clsx('rounded-lg border bg-surface', className)}>
      {(title || action) && (
        <header className="flex min-h-11 items-center justify-between gap-2 border-b px-4">
          <h2 className="eyebrow">{title}</h2>
          {action}
        </header>
      )}
      <div className={flush ? '' : 'p-4'}>{children}</div>
    </section>
  )
}

/* ---------- Status tag: titik kotak + teks, bukan pill ---------- */
export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'primary'
const dotStyles: Record<Tone, string> = {
  neutral: 'bg-muted',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  primary: 'bg-primary',
}
const textStyles: Record<Tone, string> = {
  neutral: 'text-muted',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  primary: 'text-primary',
}
export function Tag({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase', textStyles[tone])}>
      <span aria-hidden className={clsx('size-1.5 shrink-0', dotStyles[tone])} />
      {children}
    </span>
  )
}

/* ---------- Form fields ---------- */
const fieldBase =
  'w-full rounded-md border bg-surface px-3 text-sm text-text placeholder:text-muted/70 transition focus:border-ink focus:outline-none disabled:opacity-60'

export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; className?: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      {children(id)}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  )
}

export function Input({ className, ...rest }: ComponentPropsWithRef<'input'>) {
  return <input {...rest} className={clsx(fieldBase, 'h-10', className)} />
}
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={clsx(fieldBase, 'h-10 pr-8', className)}>
      {children}
    </select>
  )
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={clsx(fieldBase, 'min-h-20 py-2', className)} />
}
export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" className="size-4 accent-[var(--ink)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function FormError({ message }: { message: string }) {
  if (!message) return null
  return <p className="border-l-2 border-danger bg-danger-soft px-3 py-2 text-sm text-danger">{message}</p>
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const { t } = useI18n()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col border bg-surface sm:max-w-lg sm:rounded-lg"
      >
        <header className="flex items-center justify-between border-b py-2 pr-2 pl-5">
          <h2 className="display text-xl">{title}</h2>
          <IconButton label={t('common.close')} onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t px-5 py-3">{footer}</footer>}
      </div>
    </div>
  )
}

/* ---------- States ---------- */
export function Spinner({ className }: { className?: string }) {
  const { t } = useI18n()
  return (
    <div className={clsx('flex items-center justify-center gap-2 py-12 text-sm text-muted', className)}>
      <Loader2 size={16} className="animate-spin" /> {t('common.loading')}
    </div>
  )
}

export function EmptyState({ message }: { message?: string }) {
  const { t } = useI18n()
  return <p className="px-4 py-10 text-center text-sm text-muted">{message ?? t('common.empty')}</p>
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t, tError } = useI18n()
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm text-danger">
      {tError(error)}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}

/** Render loading / error / konten sesuai status query */
export function QueryView<T>({ query, children }: { query: { data: T | undefined; error: unknown; reload: () => void }; children: (data: T) => ReactNode }) {
  if (query.error) return <ErrorState error={query.error} onRetry={query.reload} />
  if (query.data === undefined) return <Spinner />
  return <>{children(query.data)}</>
}

/* ---------- Page header ---------- */
export function PageHeader({ title, meta, actions }: { title: string; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {meta && <p className="mt-2 font-mono text-xs text-muted">{meta}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/* ---------- Avatar (inisial, kotak) ---------- */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      aria-hidden
      className={clsx(
        'display inline-flex shrink-0 items-center justify-center rounded-md bg-surface-2 text-text',
        size === 'sm' && 'size-8 text-sm',
        size === 'md' && 'size-10 text-base',
        size === 'lg' && 'size-20 text-3xl',
      )}
    >
      {initials(name)}
    </span>
  )
}

/* ---------- Table ---------- */
export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            {head.map((h, i) => (
              <th key={i} className="eyebrow px-4 py-2.5 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  )
}
export function Td({ className, children, colSpan }: { className?: string; children?: ReactNode; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={clsx('px-4 py-3 align-middle', className)}>
      {children}
    </td>
  )
}

/* ---------- Segmented filter ---------- */
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-md border bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'h-8 rounded-[5px] px-3 text-xs font-semibold whitespace-nowrap transition',
            value === o.value ? 'bg-ink text-ink-fg' : 'text-muted hover:text-text',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ---------- Pagination ---------- */
export function Pagination({ meta, onPage }: { meta: PageMeta; onPage: (p: number) => void }) {
  const { t } = useI18n()
  if (meta.totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between border-t px-4 py-2.5">
      <span className="font-mono text-xs text-muted">{t('common.pageOf', { page: meta.page, total: meta.totalPages })}</span>
      <div className="flex gap-1">
        <IconButton label={t('common.prev')} disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} className="disabled:opacity-30">
          <ChevronLeft size={18} />
        </IconButton>
        <IconButton label={t('common.next')} disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)} className="disabled:opacity-30">
          <ChevronRight size={18} />
        </IconButton>
      </div>
    </div>
  )
}
