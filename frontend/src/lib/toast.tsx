import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import clsx from 'clsx'

type ToastKind = 'success' | 'error'
/** Tombol opsional di toast, mis. "Urungkan" */
interface ToastAction {
  label: string
  onClick: () => void
}
interface Toast {
  id: number
  kind: ToastKind
  message: string
  action?: ToastAction
}

type Show = (message: string, kind?: ToastKind, action?: ToastAction) => void
const ToastContext = createContext<Show | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const show = useCallback<Show>(
    (message, kind = 'success', action) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t, { id, kind, message, action }])
      // Toast dengan aksi dibiarkan lebih lama agar sempat diklik
      setTimeout(() => dismiss(id), action ? 7000 : 3500)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:px-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={clsx(
              'pointer-events-auto flex max-w-sm items-center gap-2 border border-l-4 bg-surface px-4 py-3 text-sm shadow-md',
              t.kind === 'success' ? 'border-l-success text-success' : 'border-l-danger text-danger',
            )}
          >
            {t.kind === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <XCircle size={18} className="shrink-0" />}
            <span className="text-text">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="ml-2 shrink-0 text-xs font-semibold text-text uppercase underline decoration-primary decoration-2 underline-offset-4"
                onClick={() => {
                  t.action!.onClick()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
