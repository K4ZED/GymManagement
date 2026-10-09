import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { homeFor, useAuth } from '@/lib/auth'
import { useI18n } from '@/i18n'
import type { Role } from '@/types'
import { Button, Field, FormError, Input } from '@/components/ui'
import { Preferences } from '@/components/Preferences'
import { Logo } from '@/layouts/AdminLayout'

// Akun seed dari backend (lihat API_CONTRACT.md). Tombol masuk cepat tampil kecuali VITE_DEMO_LOGIN=false
const SHOW_DEMO = import.meta.env.VITE_DEMO_LOGIN !== 'false'
const DEMO_PASSWORD = 'password123'
const demoAccounts: { role: Role; email: string }[] = [
  { role: 'ADMIN', email: 'admin@gym.test' },
  { role: 'STAFF', email: 'staff@gym.test' },
  { role: 'TRAINER', email: 'trainer@gym.test' },
  { role: 'MEMBER', email: 'member@gym.test' },
]

export default function LoginPage() {
  const { t, tError } = useI18n()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState<string | null>(null) // email yang sedang diproses

  async function signIn(mail: string, pass: string) {
    setError('')
    setSubmitting(mail)
    try {
      const user = await login(mail, pass)
      navigate(homeFor(user.role), { replace: true })
    } catch (err) {
      setError(tError(err))
    } finally {
      setSubmitting(null)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void signIn(email, password)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <Logo />
        <Preferences />
      </div>
      <div className="flex flex-1 justify-center px-4 py-12 sm:items-center">
        <form onSubmit={onSubmit} className="w-full max-w-sm">
          <h1 className="display text-3xl">{t('auth.title')}</h1>

          {SHOW_DEMO && (
            <div className="mt-6">
              <p className="eyebrow mb-2">{t('auth.quickLogin')}</p>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    disabled={!!submitting}
                    onClick={() => signIn(a.email, DEMO_PASSWORD)}
                    className="flex flex-col items-start rounded-md border bg-surface px-3 py-2.5 text-left transition hover:border-ink disabled:opacity-60"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {t(`role.${a.role}`)}
                      {submitting === a.email && <Loader2 size={14} className="animate-spin" />}
                    </span>
                    <span className="text-xs text-muted">{a.email}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">{t('auth.panelNote')}</p>
              <p className="eyebrow mt-8">{t('auth.orManual')}</p>
            </div>
          )}

          <div className={SHOW_DEMO ? 'mt-3 space-y-4' : 'mt-6 space-y-4'}>
            <Field label={t('auth.email')}>
              {(id) => <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}
            </Field>
            <Field label={t('auth.password')}>
              {(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
            </Field>
            <FormError message={error} />
            <Button type="submit" className="w-full" loading={submitting === email && !!email} disabled={!!submitting}>
              {t('auth.login')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
